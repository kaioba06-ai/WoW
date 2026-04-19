// ---------------------------------------------------------
// Weather Logic (Moved from index.html)
// ---------------------------------------------------------

async function initWeather() {
    const saved = localStorage.getItem('kion_location');
    if (saved) {
        const { lat, lon, pref, city } = JSON.parse(saved);
        loadWeather(lat, lon, pref, city);
    } else {
        // デフォルト: 新宿 (位置情報が許可されない場合)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    // 位置情報から住所を取得（簡易的に座標を表示）
                    loadWeather(lat, lon, '現在地', `(${lat.toFixed(2)}, ${lon.toFixed(2)})`);
                },
                () => loadWeather(35.69, 139.70, '東京都', '新宿区')
            );
        } else {
            loadWeather(35.69, 139.70, '東京都', '新宿区');
        }
    }
}

async function loadWeather(lat, lon, pref, city) {
    if (typeof updateLocationDisplay === 'function') updateLocationDisplay(pref, city);
    
    try {
        const data = await window.KionWeather.fetchData(lat, lon);
        renderHomeWeather(data);
    } catch (err) {
        console.error('Weather Load Error:', err);
        alert('天候情報の取得に失敗しました');
    }
}

function renderHomeWeather(data) {
    const cur = data.current;
    if (!cur) return;

    // 現在の気温
    const tempEl = document.getElementById('current-temp');
    if (tempEl) tempEl.textContent = `${Math.round(cur.temperature_2m)}°`;

    // 天気アイコン・説明
    const wInfo = window.KionWeather.getWeatherInfo(cur.weather_code);
    const emojiEl = document.getElementById('weather-emoji');
    const descEl = document.getElementById('weather-desc');
    if (emojiEl) emojiEl.textContent = wInfo.emoji;
    if (descEl) descEl.textContent = wInfo.desc;

    // 傘アイコン (降水がある場合)
    const umbrella = document.getElementById('umbrella-icon');
    if (umbrella) umbrella.style.display = cur.precipitation > 0 ? 'block' : 'none';

    // 体感温度・湿度・風速チップス
    const feelsEl = document.getElementById('feels-like');
    if (feelsEl && cur.apparent_temperature != null) feelsEl.textContent = Math.round(cur.apparent_temperature);

    const humidEl = document.getElementById('humidity');
    if (humidEl && cur.relative_humidity_2m != null) humidEl.textContent = Math.round(cur.relative_humidity_2m);

    const windEl = document.getElementById('wind-speed');
    if (windEl && cur.wind_speed_10m != null) windEl.textContent = (cur.wind_speed_10m / 3.6).toFixed(1);

    // タイムライン描画
    renderTimeline(data.hourly);
}

function renderTimeline(hourly) {
    const container = document.getElementById('hourly-timeline');
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    const currentHour = now.getHours();

    // 向こう12時間のデータを表示
    for (let i = currentHour; i < currentHour + 12; i++) {
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];
        const prob = hourly.precipitation_probability[i];
        const wInfo = window.KionWeather.getWeatherInfo(code);
        const timeIcon = window.KionWeather.getTimeIcon(i % 24);

        const isNow = (i === currentHour);
        const item = document.createElement('div');
        item.className = [
            'min-w-[62px] flex flex-col items-center gap-1.5 py-3 px-2',
            'rounded-[20px] border shadow-sm transition-transform hover:scale-105',
            isNow
                ? 'bg-primary dark:bg-blue-600 border-primary/30 dark:border-blue-500/30 shadow-primary/20'
                : 'bg-white/50 dark:bg-slate-800/50 border-white/50 dark:border-white/10',
        ].join(' ');
        item.innerHTML = `
            <span class="text-[9px] font-bold ${isNow ? 'text-white/80' : 'text-on-surface-variant dark:text-white/40'}">${i % 24}:00</span>
            <span class="material-symbols-outlined text-[22px] ${isNow ? 'text-white' : wInfo.iconColor}" style="font-variation-settings:'FILL' 1">${wInfo.icon}</span>
            <span class="text-[13px] font-black leading-none ${isNow ? 'text-white' : 'text-on-surface dark:text-white'}">${temp}°</span>
            <div class="flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[10px] ${isNow ? 'text-blue-200' : 'text-blue-400/70'}">water_drop</span>
                <span class="text-[8px] font-bold ${isNow ? 'text-blue-200' : 'text-blue-500/70 dark:text-blue-400/70'}">${prob}%</span>
            </div>
        `;
        container.appendChild(item);
    }
}

// ページ読み込み時に初期化
window.addEventListener('load', () => {
    if (document.getElementById('page-home')) {
        initWeather();
    }
});

function toggleHomeLike(btn) {
    if(navigator.vibrate) navigator.vibrate([10]);
    const icon = btn.querySelector('.material-symbols-outlined');
    const liked = btn.dataset.liked === '1';
    btn.dataset.liked = liked ? '0' : '1';
    if (icon) icon.style.fontVariationSettings = liked ? "'FILL' 0" : "'FILL' 1";
    btn.classList.toggle('bg-pink-500', !liked);
    btn.classList.toggle('bg-white/20', liked);
}

function shareOutfit() {
    const data = { title: 'Kion - Transitional Trench', text: '18°Cの今日のコーデをチェック！', url: window.location.href };
    if(navigator.share) {
        navigator.share(data).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => alert('リンクをクリップボードにコピーしました'));
    }
}

function saveHomeOutfitToCloset(btn) {
    if(btn.dataset.saved === '1') { alert('このコーデはすでにクローゼットに保存済みです'); return; }
    if(navigator.vibrate) navigator.vibrate([10,5,20]);
    const imgSrc = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBB-QU0-zAmjrV7pnLKHUgiq42DhOBVi6U6n2rMhuhPAJ9DFD3yAnTg8_cZlhEtM1jt_xcRiV3V5nqV4W4nxY1nZ04NrXI0drvrqzFwWyscagoTkfQCiywc6Q61IajoyXBC3md2K_WpPzzuBhePdWIoe7PyLVPtfI1V-A8jGrbHeACqCY0D3IHkfZb5CVYYY5XqjrdkSHyVcurwXLGZqSKKex5zuDV56EJjSWt0BitnnIWfR1P_mdcj8NABNIJmFSF4Jflq8pPFew';
    const item = { id: Date.now(), name: 'Transitional Trench', category: 'outer', color: '#8B6914', colorName: 'ベージュ', memo: 'AIおすすめコーデ', img: imgSrc, addedAt: new Date().toLocaleDateString('ja-JP') };
    if (typeof closetItems !== 'undefined') {
        closetItems.unshift(item);
        if (typeof saveCloset === 'function') saveCloset();
        if (typeof renderClosetGrid === 'function') renderClosetGrid();
        btn.dataset.saved = '1';
        btn.innerHTML = '<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 1">check_circle</span> 保存済み';
        btn.classList.replace('bg-primary', 'bg-emerald-500');
        alert('クローゼットに保存しました！');
    }
}
