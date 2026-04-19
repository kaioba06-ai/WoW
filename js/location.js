// ===== [ENGINE] location.js — 位置情報データ・操作ロジック =====

const PREFECTURES = [
    { name: '北海道', cities: [
        { name: '札幌市', lat: 43.0621, lon: 141.3544 },
        { name: '旭川市', lat: 43.7709, lon: 142.3649 },
        { name: '函館市', lat: 41.7687, lon: 140.7288 },
        { name: '帯広市', lat: 42.9236, lon: 143.1966 },
    ]},
    { name: '青森県', cities: [
        { name: '青森市', lat: 40.8246, lon: 140.7400 },
        { name: '八戸市', lat: 40.5122, lon: 141.4883 },
    ]},
    { name: '岩手県', cities: [
        { name: '盛岡市', lat: 39.7036, lon: 141.1527 },
    ]},
    { name: '宮城県', cities: [
        { name: '仙台市', lat: 38.2682, lon: 140.8694 },
    ]},
    { name: '秋田県', cities: [
        { name: '秋田市', lat: 39.7200, lon: 140.1025 },
    ]},
    { name: '山形県', cities: [
        { name: '山形市', lat: 38.2405, lon: 140.3633 },
    ]},
    { name: '福島県', cities: [
        { name: '福島市', lat: 37.7503, lon: 140.4676 },
        { name: '郡山市', lat: 37.3998, lon: 140.3598 },
    ]},
    { name: '茨城県', cities: [
        { name: '水戸市', lat: 36.3418, lon: 140.4468 },
        { name: 'つくば市', lat: 36.0835, lon: 140.0764 },
    ]},
    { name: '栃木県', cities: [
        { name: '宇都宮市', lat: 36.5551, lon: 139.8829 },
    ]},
    { name: '群馬県', cities: [
        { name: '前橋市', lat: 36.3911, lon: 139.0608 },
    ]},
    { name: '埼玉県', cities: [
        { name: 'さいたま市', lat: 35.8617, lon: 139.6455 },
        { name: '川越市', lat: 35.9251, lon: 139.4857 },
    ]},
    { name: '千葉県', cities: [
        { name: '千葉市', lat: 35.6047, lon: 140.1233 },
        { name: '船橋市', lat: 35.6946, lon: 139.9824 },
    ]},
    { name: '東京都', cities: [
        { name: '新宿区', lat: 35.6938, lon: 139.7034 },
        { name: '渋谷区', lat: 35.6640, lon: 139.6982 },
        { name: '八王子市', lat: 35.6664, lon: 139.3160 },
        { name: '町田市', lat: 35.5483, lon: 139.4386 },
    ]},
    { name: '神奈川県', cities: [
        { name: '横浜市', lat: 35.4437, lon: 139.6380 },
        { name: '川崎市', lat: 35.5308, lon: 139.7030 },
        { name: '相模原市', lat: 35.5714, lon: 139.3735 },
    ]},
    { name: '新潟県', cities: [
        { name: '新潟市', lat: 37.9022, lon: 139.0233 },
    ]},
    { name: '富山県', cities: [
        { name: '富山市', lat: 36.6953, lon: 137.2113 },
    ]},
    { name: '石川県', cities: [
        { name: '金沢市', lat: 36.5613, lon: 136.6562 },
    ]},
    { name: '福井県', cities: [
        { name: '福井市', lat: 36.0652, lon: 136.2218 },
    ]},
    { name: '山梨県', cities: [
        { name: '甲府市', lat: 35.6642, lon: 138.5684 },
    ]},
    { name: '長野県', cities: [
        { name: '長野市', lat: 36.6513, lon: 138.1810 },
        { name: '松本市', lat: 36.2380, lon: 137.9720 },
    ]},
    { name: '岐阜県', cities: [
        { name: '岐阜市', lat: 35.3912, lon: 136.7223 },
    ]},
    { name: '静岡県', cities: [
        { name: '静岡市', lat: 34.9756, lon: 138.3828 },
        { name: '浜松市', lat: 34.7108, lon: 137.7261 },
    ]},
    { name: '愛知県', cities: [
        { name: '名古屋市', lat: 35.1815, lon: 136.9066 },
        { name: '豊田市', lat: 35.0826, lon: 137.1560 },
    ]},
    { name: '三重県', cities: [
        { name: '津市', lat: 34.7303, lon: 136.5086 },
    ]},
    { name: '滋賀県', cities: [
        { name: '大津市', lat: 35.0045, lon: 135.8686 },
    ]},
    { name: '京都府', cities: [
        { name: '京都市', lat: 35.0116, lon: 135.7681 },
    ]},
    { name: '大阪府', cities: [
        { name: '大阪市', lat: 34.6937, lon: 135.5023 },
        { name: '堺市', lat: 34.5733, lon: 135.4830 },
    ]},
    { name: '兵庫県', cities: [
        { name: '神戸市', lat: 34.6901, lon: 135.1956 },
        { name: '姫路市', lat: 34.8154, lon: 134.6855 },
    ]},
    { name: '奈良県', cities: [
        { name: '奈良市', lat: 34.6851, lon: 135.8049 },
    ]},
    { name: '和歌山県', cities: [
        { name: '和歌山市', lat: 34.2261, lon: 135.1675 },
    ]},
    { name: '鳥取県', cities: [
        { name: '鳥取市', lat: 35.5011, lon: 134.2351 },
    ]},
    { name: '島根県', cities: [
        { name: '松江市', lat: 35.4723, lon: 133.0505 },
    ]},
    { name: '岡山県', cities: [
        { name: '岡山市', lat: 34.6618, lon: 133.9344 },
    ]},
    { name: '広島県', cities: [
        { name: '広島市', lat: 34.3853, lon: 132.4553 },
    ]},
    { name: '山口県', cities: [
        { name: '山口市', lat: 34.1861, lon: 131.4706 },
        { name: '下関市', lat: 33.9508, lon: 130.9264 },
    ]},
    { name: '徳島県', cities: [
        { name: '徳島市', lat: 34.0658, lon: 134.5593 },
    ]},
    { name: '香川県', cities: [
        { name: '高松市', lat: 34.3401, lon: 134.0434 },
    ]},
    { name: '愛媛県', cities: [
        { name: '松山市', lat: 33.8416, lon: 132.7657 },
    ]},
    { name: '高知県', cities: [
        { name: '高知市', lat: 33.5597, lon: 133.5311 },
    ]},
    { name: '福岡県', cities: [
        { name: '福岡市', lat: 33.5904, lon: 130.4017 },
        { name: '北九州市', lat: 33.8834, lon: 130.8752 },
    ]},
    { name: '佐賀県', cities: [
        { name: '佐賀市', lat: 33.2494, lon: 130.2988 },
    ]},
    { name: '長崎県', cities: [
        { name: '長崎市', lat: 32.7503, lon: 129.8777 },
    ]},
    { name: '熊本県', cities: [
        { name: '熊本市', lat: 32.7898, lon: 130.7417 },
    ]},
    { name: '大分県', cities: [
        { name: '大分市', lat: 33.2382, lon: 131.6126 },
    ]},
    { name: '宮崎県', cities: [
        { name: '宮崎市', lat: 31.9111, lon: 131.4239 },
    ]},
    { name: '鹿児島県', cities: [
        { name: '鹿児島市', lat: 31.5966, lon: 130.5571 },
    ]},
    { name: '沖縄県', cities: [
        { name: '那覇市', lat: 26.2124, lon: 127.6809 },
    ]},
];

let selectedLocation = null;

function openLocationModal() {
    const overlay = document.getElementById('location-modal-overlay');
    const modal = document.getElementById('location-modal');
    if (!overlay || !modal) return;
    
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        modal.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    });
    const searchInput = document.getElementById('location-search');
    if (searchInput) searchInput.value = '';
    renderLocationList('');
}

function closeLocationModal() {
    const overlay = document.getElementById('location-modal-overlay');
    const modal = document.getElementById('location-modal');
    if (!overlay || !modal) return;

    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100%)';
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
    if (!list) return;
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
    if (typeof loadWeather === 'function') loadWeather(lat, lon, pref, city);
}

async function selectCurrentLocation() {
    selectedLocation = null;
    localStorage.removeItem('kion_location');
    closeLocationModal();
    const locText = document.getElementById('location-text');
    if (locText) locText.textContent = '現在地を取得中...';
    const locSub = document.getElementById('location-sub');
    if (locSub) locSub.textContent = '';
    const ping = document.getElementById('location-ping');
    if (ping) ping.style.display = '';
    if (typeof initWeather === 'function') initWeather();
}

function updateLocationDisplay(pref, city) {
    const today = new Date();
    const dateStr = `${today.getMonth()+1}月${today.getDate()}日`;
    const locText = document.getElementById('location-text');
    if (locText) locText.textContent = `${pref} ${city}`;
    const locSub = document.getElementById('location-sub');
    if (locSub) locSub.textContent = dateStr;
    const ping = document.getElementById('location-ping');
    if (ping) ping.style.display = 'none';
}
