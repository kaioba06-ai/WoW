// ===== プロフィールデータ取得 =====
function getUserProfile() {
    try {
        const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
        return {
            name: profile.name || 'ゲスト',
            personalize: profile.personalize || {},
            basic: {
                height: profile.height,
                weight: profile.weight,
                body_type: profile.personalize?.body_type
            }
        };
    } catch (e) {
        return { name: 'ゲスト', personalize: {}, basic: {} };
    }
}

// ===== 天気API (Open-Meteo) =====
// 1. 気象データのキャッシュ
let lastWeatherData = null;

/**
 * キャッシュされた気象データを使用してUIを再描画する
 * プロフィール変更時などに、APIを叩かずに即座に反映させるために使用
 */
function refreshWeatherUI() {
    if (!lastWeatherData) return;
    console.log('[Weather] Refreshing UI with cached data...');
    updateCurrentWeather(lastWeatherData);
    updateHourlyTimeline(lastWeatherData);
    updateWeeklyForecast(lastWeatherData);
}

const WMO_WEATHER = {
    0:  { desc:'快晴',         emoji:'☀️', icon:'wb_sunny',          iconColor:'text-orange-400' },
    1:  { desc:'ほぼ晴れ',     emoji:'🌤️', icon:'wb_sunny',          iconColor:'text-orange-400' },
    2:  { desc:'晴れ時々曇り', emoji:'⛅',  icon:'partly_cloudy_day', iconColor:'text-primary dark:text-blue-400' },
    3:  { desc:'曇り',         emoji:'☁️', icon:'cloud',             iconColor:'text-gray-400' },
    45: { desc:'霧',           emoji:'🌫️', icon:'foggy',             iconColor:'text-gray-400' },
    48: { desc:'着氷性の霧',   emoji:'🌫️', icon:'foggy',             iconColor:'text-gray-400' },
    51: { desc:'弱い霧雨',     emoji:'🌦️', icon:'grain',             iconColor:'text-blue-400' },
    53: { desc:'霧雨',         emoji:'🌦️', icon:'grain',             iconColor:'text-blue-400' },
    55: { desc:'強い霧雨',     emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-500' },
    61: { desc:'小雨',         emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-500' },
    63: { desc:'雨',           emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-600' },
    65: { desc:'大雨',         emoji:'🌧️', icon:'rainy_heavy',       iconColor:'text-blue-700' },
    66: { desc:'着氷性の小雨', emoji:'🧊', icon:'weather_mix',       iconColor:'text-cyan-500' },
    67: { desc:'着氷性の雨',   emoji:'🧊', icon:'weather_mix',       iconColor:'text-cyan-600' },
    71: { desc:'小雪',         emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-300' },
    73: { desc:'雪',           emoji:'❄️', icon:'weather_snowy',     iconColor:'text-sky-400' },
    75: { desc:'大雪',         emoji:'❄️', icon:'severe_cold',       iconColor:'text-sky-500' },
    77: { desc:'霧雪',         emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-300' },
    80: { desc:'にわか雨',     emoji:'🌦️', icon:'rainy_light',       iconColor:'text-blue-400' },
    81: { desc:'強いにわか雨', emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-600' },
    82: { desc:'激しいにわか雨',emoji:'⛈️', icon:'rainy_heavy',      iconColor:'text-blue-700' },
    85: { desc:'にわか雪',     emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-400' },
    86: { desc:'強いにわか雪', emoji:'❄️', icon:'severe_cold',       iconColor:'text-sky-500' },
    95: { desc:'雷雨',         emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-yellow-500' },
    96: { desc:'雹を伴う雷雨', emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-yellow-600' },
    99: { desc:'激しい雹雷雨', emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-red-500' },
};

function getWeatherInfo(code) {
    return WMO_WEATHER[code] || { desc:'不明', emoji:'❓', icon:'help', iconColor:'text-gray-400' };
}

function getClothingSuggestion(temp) {
    if (temp <= 5)  return 'ダウンコート';
    if (temp <= 10) return '厚手コート';
    if (temp <= 15) return 'コート着用';
    if (temp <= 18) return 'ジャケット';
    if (temp <= 22) return 'カーディガン';
    if (temp <= 25) return 'シャツ';
    if (temp <= 28) return '薄手シャツ';
    return 'Tシャツ';
}

function getTimeIcon(hour) {
    if (hour >= 6 && hour < 10) return 'light_mode';
    if (hour >= 10 && hour < 17) return 'partly_cloudy_day';
    if (hour >= 17 && hour < 20) return 'bedtime';
    return 'dark_mode';
}

function isRainy(code) {
    return [51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code);
}

// ===== 地域選択機能 =====
const PREFECTURES = [
    { name: '北海道', cities: [
        { name: '札幌市', lat: 43.0621, lon: 141.3544 },
        { name: '旭川市', lat: 43.7709, lon: 142.3649 },
        { name: '函館市', lat: 41.7687, lon: 140.7288 },
        { name: '帯広市', lat: 42.9236, lon: 143.1966 },
    ]},
    { name: '青森県', cities: [{ name: '青森市', lat: 40.8246, lon: 140.7400 }, { name: '八戸市', lat: 40.5122, lon: 141.4883 }]},
    { name: '岩手県', cities: [{ name: '盛岡市', lat: 39.7036, lon: 141.1527 }]},
    { name: '宮城県', cities: [{ name: '仙台市', lat: 38.2682, lon: 140.8694 }]},
    { name: '秋田県', cities: [{ name: '秋田市', lat: 39.7200, lon: 140.1025 }]},
    { name: '山形県', cities: [{ name: '山形市', lat: 38.2405, lon: 140.3633 }]},
    { name: '福島県', cities: [{ name: '福島市', lat: 37.7503, lon: 140.4676 }, { name: '郡山市', lat: 37.3998, lon: 140.3598 }]},
    { name: '茨城県', cities: [{ name: '水戸市', lat: 36.3418, lon: 140.4468 }, { name: 'つくば市', lat: 36.0835, lon: 140.0764 }]},
    { name: '栃木県', cities: [{ name: '宇都宮市', lat: 36.5551, lon: 139.8829 }]},
    { name: '群馬県', cities: [{ name: '前橋市', lat: 36.3911, lon: 139.0608 }]},
    { name: '埼玉県', cities: [{ name: 'さいたま市', lat: 35.8617, lon: 139.6455 }, { name: '川越市', lat: 35.9251, lon: 139.4857 }]},
    { name: '千葉県', cities: [{ name: '千葉市', lat: 35.6047, lon: 140.1233 }, { name: '船橋市', lat: 35.6946, lon: 139.9824 }]},
    { name: '東京都', cities: [
        { name: '新宿区', lat: 35.6938, lon: 139.7034 },
        { name: '渋谷区', lat: 35.6640, lon: 139.6982 },
        { name: '八王子市', lat: 35.6664, lon: 139.3160 },
        { name: '町田市', lat: 35.5483, lon: 139.4386 },
    ]},
    { name: '神奈川県', cities: [{ name: '横浜市', lat: 35.4437, lon: 139.6380 }, { name: '川崎市', lat: 35.5308, lon: 139.7030 }, { name: '相模原市', lat: 35.5714, lon: 139.3735 }]},
    { name: '新潟県', cities: [{ name: '新潟市', lat: 37.9022, lon: 139.0233 }]},
    { name: '富山県', cities: [{ name: '富山市', lat: 36.6953, lon: 137.2113 }]},
    { name: '石川県', cities: [{ name: '金沢市', lat: 36.5613, lon: 136.6562 }]},
    { name: '福井県', cities: [{ name: '福井市', lat: 36.0652, lon: 136.2218 }]},
    { name: '山梨県', cities: [{ name: '甲府市', lat: 35.6642, lon: 138.5684 }]},
    { name: '長野県', cities: [{ name: '長野市', lat: 36.6513, lon: 138.1810 }, { name: '松本市', lat: 36.2380, lon: 137.9720 }]},
    { name: '岐阜県', cities: [{ name: '岐阜市', lat: 35.3912, lon: 136.7223 }]},
    { name: '静岡県', cities: [{ name: '静岡市', lat: 34.9756, lon: 138.3828 }, { name: '浜松市', lat: 34.7108, lon: 137.7261 }]},
    { name: '愛知県', cities: [{ name: '名古屋市', lat: 35.1815, lon: 136.9066 }, { name: '豊田市', lat: 35.0826, lon: 137.1560 }]},
    { name: '三重県', cities: [{ name: '津市', lat: 34.7303, lon: 136.5086 }]},
    { name: '滋賀県', cities: [{ name: '大津市', lat: 35.0045, lon: 135.8686 }]},
    { name: '京都府', cities: [{ name: '京都市', lat: 35.0116, lon: 135.7681 }]},
    { name: '大阪府', cities: [{ name: '大阪市', lat: 34.6937, lon: 135.5023 }, { name: '堺市', lat: 34.5733, lon: 135.4830 }]},
    { name: '兵庫県', cities: [{ name: '神戸市', lat: 34.6901, lon: 135.1956 }, { name: '姫路市', lat: 34.8154, lon: 134.6855 }]},
    { name: '奈良県', cities: [{ name: '奈良市', lat: 34.6851, lon: 135.8049 }]},
    { name: '和歌山県', cities: [{ name: '和歌山市', lat: 34.2261, lon: 135.1675 }]},
    { name: '鳥取県', cities: [{ name: '鳥取市', lat: 35.5011, lon: 134.2351 }]},
    { name: '島根県', cities: [{ name: '松江市', lat: 35.4723, lon: 133.0505 }]},
    { name: '岡山県', cities: [{ name: '岡山市', lat: 34.6618, lon: 133.9344 }]},
    { name: '広島県', cities: [{ name: '広島市', lat: 34.3853, lon: 132.4553 }]},
    { name: '山口県', cities: [{ name: '山口市', lat: 34.1861, lon: 131.4706 }, { name: '下関市', lat: 33.9508, lon: 130.9264 }]},
    { name: '徳島県', cities: [{ name: '徳島市', lat: 34.0658, lon: 134.5593 }]},
    { name: '香川県', cities: [{ name: '高松市', lat: 34.3401, lon: 134.0434 }]},
    { name: '愛媛県', cities: [{ name: '松山市', lat: 33.8416, lon: 132.7657 }]},
    { name: '高知県', cities: [{ name: '高知市', lat: 33.5597, lon: 133.5311 }]},
    { name: '福岡県', cities: [{ name: '福岡市', lat: 33.5904, lon: 130.4017 }, { name: '北九州市', lat: 33.8834, lon: 130.8752 }]},
    { name: '佐賀県', cities: [{ name: '佐賀市', lat: 33.2494, lon: 130.2988 }]},
    { name: '長崎県', cities: [{ name: '長崎市', lat: 32.7503, lon: 129.8777 }]},
    { name: '熊本県', cities: [{ name: '熊本市', lat: 32.7898, lon: 130.7417 }]},
    { name: '大分県', cities: [{ name: '大分市', lat: 33.2382, lon: 131.6126 }]},
    { name: '宮崎県', cities: [{ name: '宮崎市', lat: 31.9111, lon: 131.4239 }]},
    { name: '鹿児島県', cities: [{ name: '鹿児島市', lat: 31.5966, lon: 130.5571 }]},
    { name: '沖縄県', cities: [{ name: '那覇市', lat: 26.2124, lon: 127.6809 }]},
];

let selectedLocation = null;

function openLocationModal() {
    const overlay = document.getElementById('location-modal-overlay');
    const modal = document.getElementById('location-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(-50%)';
        modal.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    });
    document.getElementById('location-search').value = '';
    renderLocationList('');
}

function closeLocationModal() {
    const overlay = document.getElementById('location-modal-overlay');
    const modal = document.getElementById('location-modal');
    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100vh)';
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }, 350);
}

function filterLocations(query) {
    renderLocationList(query.trim());
}

function renderLocationList(query) {
    const list = document.getElementById('location-list');
    list.innerHTML = '';
    const q = query.toLowerCase();

    PREFECTURES.forEach(pref => {
        const matchingCities = pref.cities.filter(c =>
            !q || pref.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        );
        if (matchingCities.length === 0) return;

        const prefHeader = document.createElement('div');
        prefHeader.className = 'text-[10px] font-bold text-on-surface-variant dark:text-white/50 uppercase tracking-widest mt-3 mb-1 px-1';
        prefHeader.textContent = pref.name;
        list.appendChild(prefHeader);

        matchingCities.forEach(city => {
            const isSelected = selectedLocation && selectedLocation.lat === city.lat && selectedLocation.lon === city.lon;
            const btn = document.createElement('button');
            btn.className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors active:scale-[0.98] ${isSelected ? 'bg-primary/15 dark:bg-blue-500/25 border border-primary/30 dark:border-blue-500/40' : 'hover:bg-black/5 dark:hover:bg-white/5'}`;
            btn.innerHTML = `
                <span class="material-symbols-outlined text-[18px] ${isSelected ? 'text-primary dark:text-blue-400' : 'text-on-surface-variant dark:text-white/40'}">location_city</span>
                <span class="font-medium text-sm ${isSelected ? 'text-primary dark:text-blue-300' : 'text-on-surface dark:text-white'}">${city.name}</span>
                ${isSelected ? '<span class="material-symbols-outlined text-primary dark:text-blue-400 text-[18px] ml-auto">check_circle</span>' : ''}
            `;
            btn.onclick = () => selectManualLocation(pref.name, city.name, city.lat, city.lon);
            list.appendChild(btn);
        });
    });

    if (list.children.length === 0) {
        list.innerHTML = '<p class="text-center text-on-surface-variant dark:text-white/50 text-sm py-8">該当する地域が見つかりません</p>';
    }
}

function selectManualLocation(pref, city, lat, lon) {
    selectedLocation = { lat, lon, pref, city };
    localStorage.setItem('kion_location', JSON.stringify(selectedLocation));
    closeLocationModal();
    loadWeather(lat, lon, pref, city);
}

async function selectCurrentLocation() {
    selectedLocation = null;
    localStorage.removeItem('kion_location');
    closeLocationModal();
    document.getElementById('location-text').textContent = '現在地を取得中...';
    document.getElementById('location-ping').style.display = '';
    initWeather();
}

function updateLocationDisplay(pref, city) {
    const today = new Date();
    const dateStr = `${today.getMonth()+1}月${today.getDate()}日`;
    document.getElementById('location-text').textContent = `${pref} ${city}`;
    document.getElementById('location-ping').style.display = 'none';
}

async function loadWeather(lat, lon, pref, city) {
    console.log(`[Weather] Loading weather for: ${pref} ${city} (${lat}, ${lon})`);
    updateLocationDisplay(pref, city);
    try {
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
            + `&current=temperature_2m,apparent_temperature,weather_code,precipitation`
            + `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability`
            + `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code,precipitation_probability_max`
            + `&timezone=auto&forecast_days=8&past_days=1`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
        const data = await res.json();
        
        console.log('[Weather] Data fetched successfully. Updating UI...');
        lastWeatherData = data; // キャッシュに保存
        updateCurrentWeather(data);
        updateHourlyTimeline(data);
        updateWeeklyForecast(data);
    } catch(e) {
        console.error('[Weather] Failed to load weather:', e);
        const descEl = document.getElementById('weather-desc');
        if (descEl) descEl.textContent = '取得失敗';
        // 不足している要素の参照エラーを防ぐ
        const tempEl = document.getElementById('current-temp');
        if (tempEl) tempEl.textContent = '--°C';
    }
}

async function initWeather() {
    console.log('[Weather] Initializing weather process...');
    const saved = localStorage.getItem('kion_location');
    if (saved) {
        try {
            const loc = JSON.parse(saved);
            selectedLocation = loc;
            console.log('[Weather] Using saved location:', loc.city);
            loadWeather(loc.lat, loc.lon, loc.pref, loc.city);
            return;
        } catch(e) {
            console.warn('[Weather] Corrupt saved location, clearing...');
            localStorage.removeItem('kion_location');
        }
    }

    let lat = 35.6812, lon = 139.7671;
    let pref = '東京都';
    let city = '新宿区';

    console.log('[Weather] Requesting current position (5s timeout)...');
    try {
        const pos = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Geolocation timeout')), 5000);
            navigator.geolocation.getCurrentPosition(
                (p) => { clearTimeout(timeoutId); resolve(p); },
                (e) => { clearTimeout(timeoutId); reject(e); },
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        console.log('[Weather] Geolocation success:', lat, lon);
    } catch(e) {
        console.warn('[Weather] Geolocation failed or timed out, trying IP fallback:', e.message);
        try {
            const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude && ipData.longitude) {
                lat = parseFloat(ipData.latitude);
                lon = parseFloat(ipData.longitude);
                console.log('[Weather] IP location success:', lat, lon);
            }
        } catch(ipErr) {
            console.error('[Weather] IP fallback failed:', ipErr);
        }
    }

    try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ja`);
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        pref = addr.state || addr.province || '';
        city = addr.city || addr.town || addr.village || addr.county || '現在地';
    } catch(e) {
        console.warn('[Weather] Reverse geocoding failed:', e);
        pref = '';
        city = '現在地';
    }

    loadWeather(lat, lon, pref, city);
}
function getCustomDynamicWeather(data) {
    const nowHour = new Date().getHours();
    const todayIndex = data.hourly.time.findIndex(t => {
        const d = new Date(t);
        return d.getDate() === new Date().getDate() && d.getHours() === nowHour;
    });
    
    if (todayIndex < 0 || !data.hourly.weather_code || data.hourly.weather_code.length < todayIndex + 24) {
        // Fallback
        const dailyCode = data.daily.weather_code[1] !== undefined ? data.daily.weather_code[1] : data.daily.weather_code[0];
        return getWeatherInfo(dailyCode);
    }
    
    const codes = data.hourly.weather_code.slice(todayIndex, todayIndex + 24);
    const times = data.hourly.time.slice(todayIndex, todayIndex + 24);
    
    const categorize = (code, hour) => {
        const isNight = hour >= 18 || hour <= 5;
        if ([0, 1].includes(code)) return { id: 'sunny', desc: '晴れ', emoji: isNight ? '🌟' : '☀️' };
        if ([2, 3, 45, 48].includes(code)) return { id: 'cloudy', desc: '曇り', emoji: '☁️' };
        if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { id: 'rain', desc: '雨', emoji: '☔️' };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { id: 'snow', desc: '雪', emoji: '⛄️' };
        if ([95, 96, 99].includes(code)) return { id: 'thunder', desc: '雷雨', emoji: '⚡️' };
        return { id: 'cloudy', desc: '曇り', emoji: '☁️' };
    };

    const parsed = codes.map((c, i) => {
        const d = new Date(times[i]);
        return categorize(c, d.getHours());
    });

    const getDominant = (arr) => {
        const counts = {};
        arr.forEach(p => { counts[p.id] = (counts[p.id] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
        const domId = sorted[0][0];
        const rep = arr.find(p => p.id === domId);
        return { id: domId, desc: rep.desc, emoji: rep.emoji, total: sorted[0][1] };
    };

    const firstHalf = parsed.slice(0, 12);
    const secondHalf = parsed.slice(12, 24);

    const dom1 = getDominant(firstHalf);
    const dom2 = getDominant(secondHalf);

    if (dom1.id !== dom2.id) {
        return {
            desc: `${dom1.desc}のち${dom2.desc}`,
            emoji: `${dom1.emoji}/${dom2.emoji}`
        };
    }

    const fullCounts = {};
    parsed.forEach(p => { fullCounts[p.id] = (fullCounts[p.id] || 0) + 1; });
    const sortedFull = Object.entries(fullCounts).sort((a,b) => b[1] - a[1]);
    
    if (sortedFull.length > 1 && sortedFull[1][1] >= 3) {
        const subId = sortedFull[1][0];
        const repSub = parsed.find(p => p.id === subId);
        return {
            desc: `${dom1.desc}時々${repSub.desc}`,
            emoji: `${dom1.emoji}/${repSub.emoji}`
        };
    }

    return {
        desc: dom1.desc,
        emoji: dom1.emoji
    };
}

function updateCurrentWeather(data) {
    const current = data.current;
    const temp = Math.round(current.temperature_2m);
    const apparentTemp = Math.round(current.apparent_temperature);
    
    // 向こう24時間の天気を解析して文字列を作る
    const weatherInfo = getCustomDynamicWeather(data);

    const maxApparent = Math.round(data.daily.apparent_temperature_max[1] || data.daily.apparent_temperature_max[0]);
    const minApparent = Math.round(data.daily.apparent_temperature_min[1] || data.daily.apparent_temperature_min[0]);

    const apparentMaxEl = document.getElementById('apparent-max-temp');
    if (apparentMaxEl) apparentMaxEl.textContent = `${maxApparent}°`;
    const apparentMinEl = document.getElementById('apparent-min-temp');
    if (apparentMinEl) apparentMinEl.textContent = `${minApparent}°`;
    const emojiEl = document.getElementById('weather-emoji');
    if (emojiEl) emojiEl.textContent = weatherInfo.emoji;
    
    const descEl = document.getElementById('weather-desc');
    if (descEl) descEl.textContent = weatherInfo.desc;

    const nowHour = new Date().getHours();
    const hourlyProb = data.hourly.precipitation_probability || [];
    const todayIndex = data.hourly.time.findIndex(t => new Date(t).getDate() === new Date().getDate() && new Date(t).getHours() === nowHour);
    if (todayIndex >= 0) {
        const upcoming = hourlyProb.slice(todayIndex, todayIndex + 6);
        const maxProb = Math.max(...upcoming);
        if (maxProb >= 40) {
            const umbrella = document.getElementById('umbrella-icon');
            if (umbrella) {
                umbrella.style.display = '';
                umbrella.title = `降水確率 ${maxProb}%`;
            }
        }
    }

    const dailyMax = data.daily.temperature_2m_max;
    if (dailyMax.length >= 2) {
        const yesterdayMax = Math.round(dailyMax[0]);
        const todayMax = Math.round(dailyMax[1]);
        const diff = todayMax - yesterdayMax;
        const badge = document.getElementById('temp-diff-badge');
        const diffText = document.getElementById('temp-diff-text');

        if (badge) {
            if (diff > 0) {
                badge.style.display = 'flex';
                badge.className = 'flex items-center gap-1.5 text-[10px] font-bold bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-500/20 w-max';
                const iconEl = badge.querySelector('.material-symbols-outlined');
                if (iconEl) iconEl.textContent = 'trending_up';
                if (diffText) diffText.textContent = `昨日より +${diff}°C`;
            } else if (diff < 0) {
                badge.style.display = 'flex';
                badge.className = 'flex items-center gap-1.5 text-[10px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 w-max';
                const iconEl2 = badge.querySelector('.material-symbols-outlined');
                if (iconEl2) iconEl2.textContent = 'trending_down';
                if (diffText) diffText.textContent = `昨日より ${diff}°C`;
            } else {
                badge.style.display = 'none';
            }
        }
    }
}

// OUTFIT_CATALOG is now loaded from js/outfits.js

function getBestOutfit(apparentTemp, seed, weatherCode, hour) {
    const profile = getUserProfile();
    const p = profile.personalize;

    // 1. 体感温度のパーソナライズ (Sensitivity adjustment)
    let adjustedTemp = apparentTemp;
    if (p.temp_sensitivity === '極度の寒がり') adjustedTemp -= 4;
    else if (p.temp_sensitivity === '寒がり') adjustedTemp -= 2;
    else if (p.temp_sensitivity === '暑がり') adjustedTemp += 2;
    else if (p.temp_sensitivity === '極度の暑がり') adjustedTemp += 4;

    let category = 'mild';
    if (adjustedTemp <= 10) category = 'cold';
    else if (adjustedTemp <= 20) category = 'mild';
    else if (adjustedTemp <= 27) category = 'warm';
    else category = 'hot';

    // 2. カタログからの選択 (好きな服装＝対象スタイルを優先)
    let stylePreference = p.gender; // "mens", "ladies", "none" (ID based)
    const physicalGender = p.body_gender; // "male", "female", "none" (ID based)

    // 好きな服装が未設定または「こだわらない」の場合、基本データの性別をデフォルトとして扱う
    if (!stylePreference || stylePreference === 'none' || stylePreference === 'こだわらない') {
        if (physicalGender === 'female' || physicalGender === '女性') stylePreference = 'ladies';
        else if (physicalGender === 'male' || physicalGender === '男性') stylePreference = 'mens';
    }

    const options = OUTFIT_CATALOG[category];
    let filteredOptions = options;
    if (stylePreference === 'ladies' || stylePreference === 'レディース') {
        const womenOptions = options.filter(o => o.gender === 'female' || o.gender === 'unisex');
        if (womenOptions.length > 0) filteredOptions = womenOptions;
    } else if (stylePreference === 'mens' || stylePreference === 'メンズ') {
        const menOptions = options.filter(o => o.gender === 'male' || o.gender === 'unisex');
        if (menOptions.length > 0) filteredOptions = menOptions;
    }

    const baseOutfit = filteredOptions[seed % filteredOptions.length];
    
    // 3. 雨・雪の判定 (Sensitivity adjustment for rain)
    const rainCodes = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    let isRain = rainCodes.includes(weatherCode);
    
    // 「防水優先」設定なら、雨の予兆（曇りなど）や低確率でも雨具を考慮するロジックの土台
    if (p.rain_sensitivity === '小雨でも防水優先' && !isRain) {
        // 実際には降水確率データも渡して判定するのが理想だが、ここではコードベースでの対応を強化
    }
    
    const isSnow = [71, 73, 75, 77, 85, 86].includes(weatherCode);
    
    // 時間帯の判定
    const isMorning = hour >= 6 && hour < 10;
    const isDay     = hour >= 10 && hour < 16;
    const isEvening = hour >= 16 && hour < 19;
    const isNight   = hour >= 19 || hour < 6;
    
    let weatherPrefix = '';
    let addOnDesc = '';
    let modifiedItems = JSON.parse(JSON.stringify(baseOutfit.items));
    let mainImg = baseOutfit.img;

    // 特殊天候（雨・雪）の処理
    if (isRain) {
        weatherPrefix = '☔️ 雨';
        addOnDesc = '足元の雨対策を忘れずに。';
        if (modifiedItems.length >= 4) {
             modifiedItems[3] = { label: 'Umbrella', img: 'https://images.unsplash.com/photo-1559418296-65715bd8eb48?auto=format&fit=crop&q=80&w=400' };
        }
        // パーソナライズを優先するため、性別のない環境画像への上書きを一旦停止
        // if (category === 'cold')       mainImg = 'assets/img/outfits/rain_cold.png';
        // ... (以下略)
    } else if (isSnow) {
        weatherPrefix = '⛄️ 雪';
        addOnDesc = '滑りにくい靴としっかりした防寒を。';
        if (modifiedItems.length >= 4) {
             modifiedItems[3] = { label: 'Boots', img: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&q=80&w=400' };
        }
        // mainImg = 'assets/img/outfits/snow_cold.png';
    } else {
        // 通常時の時間帯別画像切り替えもパーソナライズを優先
        /*
        if (isNight) {
            if (category === 'cold')       mainImg = 'assets/img/outfits/night_cold.png';
            ...
        }
        */
    }

    // 接頭辞の統合 (上書きせず、[] 内に情報を並べる)
    const personalPrefix = (p.temp_sensitivity && p.temp_sensitivity !== '普通') ? `${p.temp_sensitivity}向け` : '';
    const tempText = `体感${apparentTemp}℃`;
    const fullPrefixArr = [weatherPrefix, personalPrefix, tempText].filter(x => x);
    const finalPrefix = `[${fullPrefixArr.join(' / ')}] `;

    // 4. ビジュアルメタデータ (プロンプト要素) の生成 (Generative Image Mechanism)
    // ユーザーの属性と天候から、理想的なモデルと服装を描写するプロンプトを自動構成
    const userRoots = p.lineage || 'East Asian';
    const skinTonePref = p.skin_tone || 'Natural';
    
    const visualPrompt = {
        modelGender: physicalGender === 'female' ? 'female' : (physicalGender === 'male' ? 'male' : 'non-binary'),
        outfitStyle: stylePreference === 'ladies' ? 'feminine' : (stylePreference === 'mens' ? 'masculine' : 'unisex'),
        skinTone: skinTonePref,
        style: userRoots,
        model: `${skinTonePref} skin tone woman of ${userRoots} heritage`,
        outfit: baseOutfit.title,
        context: isRain ? 'walking in the rain with an umbrella' : (isNight ? 'dim urban street at night' : 'clean architectural background'),
        lighting: isNight ? 'cinematic night lighting, neon highlights' : 'soft natural daylight'
    };

    if (stylePreference === 'mens') {
        visualPrompt.model = `${skinTonePref} skin tone man of ${userRoots} heritage`;
    }

    // デバッグ用にプロンプトを出力 (開発・生成用)
    // console.log('[Weather] Visual Prompt Generated:', visualPrompt);

    return {
        category,
        title: baseOutfit.title,
        desc: `${baseOutfit.desc} ${addOnDesc}`,
        img: mainImg,
        items: modifiedItems,
        isNight: (isNight || isEvening),
        visualPrompt: visualPrompt // AI生成用にデータを保持
    };
}

let hourlySuggestions = [];
let currentSelectedIndex = 0;

function selectSuggestion(index) {
    currentSelectedIndex = index;
    const data = hourlySuggestions[index];
    if (!data) return;

    // メインカードのDOMを更新
    const imgEl = document.getElementById('suggest-img-0');
    const titleEl = document.getElementById('suggest-title-0');
    const descEl = document.getElementById('suggest-desc-0');
    const leftBadge = document.getElementById('suggest-badge-left-0');
    const rightBadge = document.getElementById('suggest-badge-right-0');

    if (imgEl) {
        imgEl.src = data.meta.img;
        imgEl.onerror = () => {
            imgEl.src = "https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=800";
            imgEl.onerror = null;
        };
    }
    if (titleEl) titleEl.textContent = data.meta.title;
    if (descEl) descEl.textContent = data.meta.desc;

    // 統合インフォバーを更新
    const emojiEl    = document.getElementById('suggest-weather-emoji');
    const timeEl     = document.getElementById('suggest-time-label');
    const apparentEl = document.getElementById('suggest-apparent-temp');

    if (emojiEl)    emojiEl.textContent    = data.weather.emoji;
    if (timeEl)     timeEl.textContent     = data.dateString;
    if (apparentEl) apparentEl.textContent = `${data.apparentTemp}°`;    // 夜間・昼間に応じてメインカードと画面全体の背景を切り替え
    // 背景の動的な色変更を削除（ニュートラルなUIを維持するため）
    const mainCard = document.getElementById('grid-card-main');
    if (mainCard) {
        if (data.meta.isNight) {
            mainCard.classList.add('night-mode-card');
        } else {
            mainCard.classList.remove('night-mode-card');
        }
    }

    // 下段カードのハイライト状態を更新
    for (let i = 0; i < 4; i++) {
        const card = document.getElementById(`grid-card-${i}`);
        if (card) {
            if (i === index) {
                card.classList.add('ring-2', 'ring-primary', 'dark:ring-blue-400', 'bg-white/50', 'dark:bg-black/40');
                card.classList.remove('opacity-60');
            } else {
                card.classList.remove('ring-2', 'ring-primary', 'dark:ring-blue-400', 'bg-white/50', 'dark:bg-black/40');
                card.classList.add('opacity-60');
            }
        }
    }
    
    // メインカード自体のハイライト設定 (NOWの時は枠線を出す)
    if (mainCard) {
        if (index === 0) {
            mainCard.classList.add('ring-2', 'ring-primary', 'dark:ring-blue-400');
        } else {
            mainCard.classList.remove('ring-2', 'ring-primary', 'dark:ring-blue-400');
        }
    }
}

// ヘルパー関数: アイテム要素の作成
function createHeaderItemElement(item) {
    const div = document.createElement('div');
    div.className = 'flex flex-col items-center gap-1.5 group cursor-pointer flex-shrink-0';
    div.innerHTML = `
        <div class="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-white/20 dark:border-white/10 overflow-hidden group-hover:scale-105 transition-transform">
             <img src="${item.img}" class="w-full h-full object-cover" />
        </div>
        <span class="text-[8px] font-bold opacity-40 uppercase tracking-widest">${item.label}</span>
    `;
    return div;
}

// ハブリッド・ボトムシート（詳細表示）の制御
function openOutfitDetail(index) {
    const data = hourlySuggestions[index];
    if (!data) return;

    const overlay = document.getElementById('outfit-detail-overlay');
    const modal = document.getElementById('outfit-detail-modal');
    const scrollContainer = document.getElementById('outfit-detail-scroll-container');
    

    // 基本データ
    document.getElementById('detail-hero-img').src = data.meta.img;
    document.getElementById('detail-title').textContent = data.meta.title;
    document.getElementById('detail-desc').textContent = data.meta.desc;

    // 天気チップ
    const emojiEl = document.getElementById('detail-weather-emoji');
    const descEl  = document.getElementById('detail-weather-desc');
    const timeEl  = document.getElementById('detail-time-label');
    if (emojiEl) emojiEl.textContent = data.weather.emoji;
    if (descEl)  descEl.textContent  = data.weather.desc;
    if (timeEl)  timeEl.textContent  = data.dateString;

    // 気温チップ
    const tempChip = document.getElementById('detail-weather-temp');
    if (tempChip) {
        tempChip.textContent = `${data.apparentTemp}°`;
    }

    const precipEl = document.getElementById('detail-weather-precip');
    if (precipEl) {
        precipEl.textContent = `0%`;
    }

    // アイテム一覧（画像下の横スクロールリスト）
    const grid = document.getElementById('detail-items-grid');
    grid.innerHTML = '';
    data.meta.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'flex flex-col items-center gap-2 shrink-0 cursor-pointer group';
        card.innerHTML = `
            <div class="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-black/5 dark:border-white/10 shadow-md group-hover:scale-105 transition-transform">
                <img src="${item.img}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=200'; this.onerror=null;"/>
            </div>
            <span class="text-[9px] font-black uppercase tracking-widest text-on-surface-variant dark:text-white/50 text-center">${item.label}</span>
        `;
        grid.appendChild(card);
    });

    // 表示アニメーション
    if (overlay && modal) {
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateX(-50%) translateY(0)';
            if (scrollContainer) scrollContainer.scrollTop = 0;
        });
    }
}

function closeOutfitDetail() {
    const overlay = document.getElementById('outfit-detail-overlay');
    const modal = document.getElementById('outfit-detail-modal');
    
    if (overlay && modal) {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateX(-50%) translateY(100%)';
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            modal.classList.add('hidden');
        }, 500);
    }
}

function openCurrentOutfitDetail() {
    openOutfitDetail(currentSelectedIndex);
}

// ヘルパー関数: Otherバッジの作成
function createOtherBadgeElement(count) {
    const div = document.createElement('div');
    div.className = 'flex flex-col items-center gap-1.5 group cursor-pointer flex-shrink-0';
    div.innerHTML = `
        <div class="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-blue-500/10 border border-dashed border-primary/30 dark:border-blue-500/30 flex items-center justify-center overflow-hidden hover:bg-primary/20 transition-colors">
            <span class="text-[10px] font-black text-primary dark:text-blue-400">+${count}</span>
        </div>
        <span class="text-[8px] font-bold opacity-40 uppercase tracking-widest">Other</span>
    `;
    return div;
}

function updateHourlyTimeline(data) {
    const now = new Date();
    const nowHour = now.getHours();
    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const apparentTemps = data.hourly.apparent_temperature || [];
    const codes = data.hourly.weather_code;

    const startIndex = times.findIndex(t => {
        const d = new Date(t);
        // 日付の一致をより確実に判定（年・月・日）
        const isSameDay = d.getFullYear() === now.getFullYear() &&
                          d.getMonth() === now.getMonth() &&
                          d.getDate() === now.getDate();
        return isSameDay && d.getHours() >= nowHour;
    });
    if (startIndex < 0) {
        console.warn(`[Weather] Could not find forecast for ${now.toLocaleDateString()} ${nowHour}:00. Fallback to index 0.`);
    }
    const safeStartIndex = startIndex < 0 ? 0 : startIndex;

    // targetOffsets = [0, 3, 6, 12] に基づいて下段カードを更新
    const targetOffsets = [0, 3, 6, 12];
    hourlySuggestions = []; 

    targetOffsets.forEach((offset, i) => {
        const idx = safeStartIndex + offset;
        if (idx >= times.length) return;

        const temp = Math.round(temps[idx]);
        const apparentTemp = Math.round(apparentTemps[idx] || temp);
        const weatherInfo = getWeatherInfo(codes[idx]);
        const d = new Date(times[idx]);
        const month = d.getMonth() + 1;
        const dDate = d.getDate();
        const hour = d.getHours();
        const hh = String(hour).padStart(2, '0');
        
        const isNowLocal = offset === 0;
        const dateString = isNowLocal ? 'NOW' : `${hh}:00`;
        const contextLabel = isNowLocal ? 'NOW' : `${hh}:00`;

        // 気温と天候と時間帯に基づいた最適なコーディネートを取得
        const bestOutfit = getBestOutfit(apparentTemp, i, codes[idx], hour);

        hourlySuggestions.push({
            temp,
            apparentTemp,
            weather: weatherInfo,
            dateString,
            contextLabel,
            hour,
            meta: bestOutfit
        });

        const leftEl = document.getElementById(`grid-badge-left-${i}`);
        const rightEl = document.getElementById(`grid-badge-right-${i}`);
        const iconEl = document.getElementById(`grid-badge-icon-${i}`);
        const imgEl = document.getElementById(`grid-img-${i}`);
        
        if (imgEl) {
            imgEl.src = bestOutfit.img;
            imgEl.onerror = () => {
                imgEl.src = "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=400";
                imgEl.onerror = null;
            };
        }
        
        if (leftEl && rightEl) {
            const badgeOverlay = leftEl.parentElement;
            if (badgeOverlay) {
                badgeOverlay.classList.remove('hidden');
            }
            leftEl.classList.remove('hidden');
            rightEl.classList.remove('hidden');
            if (iconEl) iconEl.classList.remove('hidden');

            // 時間ラベルを表示
            const timeSpan = leftEl.querySelector('span');
            if (timeSpan) timeSpan.textContent = dateString;

            // 気温バッジを更新
            const tempSpan = rightEl.querySelector('span');
            if (tempSpan) tempSpan.textContent = `${apparentTemp}°`;

            // 天気絵文字を更新
            if (iconEl) iconEl.textContent = weatherInfo.emoji;

            // オーバーレイを表示
            const gridOverlay = document.getElementById(`grid-overlay-${i}`);
            if (gridOverlay) gridOverlay.classList.remove('opacity-0');
        }
    });

    if (hourlySuggestions.length > 0) {
        selectSuggestion(0);
    }
}

// WEEKLY_OUTFIT_IMGS is now loaded from js/outfits.js

function updateWeeklyForecast(data) {
    const grid = document.getElementById('weekly-grid');
    if (!grid) {
        console.warn('[Weather] weekly-grid not found. Skipping weekly forecast update.');
        return;
    }
    grid.innerHTML = '';

    const dates = data.daily.time;
    const maxTemps = data.daily.temperature_2m_max;
    const minTemps = data.daily.temperature_2m_min;
    const apparentMaxTemps = data.daily.apparent_temperature_max || maxTemps;
    const codes = data.daily.weather_code;
    const precipProbs = data.daily.precipitation_probability_max;

    let cardIndex = 0;
    for (let i = 1; i < dates.length && cardIndex < 7; i++, cardIndex++) {
        const d = new Date(dates[i]);
        const isToday = cardIndex === 0;
        const dayName = DAY_NAMES[d.getDay()];
        const dateLabel = isToday
            ? `Today / ${d.getMonth()+1}月${d.getDate()}日`
            : `${dayName} / ${d.getDate()}`;
        const maxT = Math.round(maxTemps[i]);
        const minT = Math.round(minTemps[i]);
        const aMaxT = Math.round(apparentMaxTemps[i]);
        const weatherInfo = getWeatherInfo(codes[i]);
        const prob = precipProbs[i];
        const imgSrc = WEEKLY_OUTFIT_IMGS[cardIndex % WEEKLY_OUTFIT_IMGS.length];
        const suggestion = getClothingSuggestion(aMaxT);

        const iconColor = codes[i] <= 3
            ? 'text-orange-400'
            : codes[i] <= 49
            ? 'text-slate-400'
            : 'text-blue-400';

        // 週間予報も天候・気温連動のテキストにする
        const bestOutfit = getBestOutfit(aMaxT, i, codes[i], 12); // お昼時点を想定
        const detailTip = bestOutfit.desc;

        const card = document.createElement('div');
        card.className = 'k-card' + (isToday ? ' expanded' : '');
        card.setAttribute('onclick', 'expandFlexCard(this)');
        card.innerHTML = `
            <div class="k-card-main">
                <div class="k-card-info">
                    <span class="k-date-label">${dateLabel}</span>
                    <span class="material-symbols-outlined ${iconColor} ${isToday ? 'text-3xl' : 'text-2xl'} mb-1">${weatherInfo.icon}</span>
                    <span class="k-temp-main dark:text-white">${maxT}° <span class="text-xs opacity-60 font-normal">/ ${minT}°</span></span>
                    <span class="text-[9px] font-bold text-primary dark:text-blue-400 mt-1 opacity-80">${weatherInfo.desc}</span>
                    ${prob >= 40 ? `<span class="text-[9px] font-bold text-blue-500 dark:text-blue-300 mt-0.5">☂ ${prob}%</span>` : ''}
                </div>
                <div class="k-card-img-wrap">
                    <img src="${bestOutfit.img}" alt="コーデ" loading="lazy" />
                </div>
            </div>
            <div class="k-card-detail">
                <div class="border-t border-black/5 dark:border-white/10 pt-2 text-[10px] text-on-surface-variant dark:text-white/70 font-bold leading-relaxed">
                    ${detailTip}
                </div>
            </div>`;
        grid.appendChild(card);
    }
}

function expandFlexCard(card) {
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.k-card');
    const isAlreadyExpanded = card.classList.contains('expanded');
    cards.forEach(c => c.classList.remove('expanded'));
    if (!isAlreadyExpanded) {
        card.classList.add('expanded');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function refreshWeeklyData() {
    const grid = document.getElementById('weekly-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="k-card skeleton" style="min-height:130px;"></div>
            <div class="k-card skeleton" style="min-height:130px;"></div>
            <div class="k-card skeleton" style="min-height:130px;"></div>
            <div class="k-card skeleton" style="min-height:130px;"></div>`;
    }
    initWeather();
}

// 天気データの取得を開始
window.addEventListener('sectionsLoaded', () => {
    initWeather();
});
