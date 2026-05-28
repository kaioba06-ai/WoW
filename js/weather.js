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

/**
 * 気温から10段階のサーマルレベルを取得する (5度刻み)
 * Lv.1: 0℃以下, Lv.10: 40℃超
 */
function getThermalLevel(temp) {
    if (temp <= 0)  return 1;
    if (temp <= 5)  return 2;
    if (temp <= 10) return 3;
    if (temp <= 15) return 4;
    if (temp <= 20) return 5;
    if (temp <= 25) return 6;
    if (temp <= 30) return 7;
    if (temp <= 35) return 8;
    if (temp <= 40) return 9;
    return 10;
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

const WEATHER_CACHE_KEY = 'kion_weather_cache_v1';
const WEATHER_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30分

function _loadWeatherCache(lat, lon) {
    try {
        const raw = localStorage.getItem(WEATHER_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        if (!cache || !cache.data) return null;
        // 位置が一致するキャッシュのみ採用（0.01度=約1km単位で比較）
        if (Math.abs(cache.lat - lat) > 0.01 || Math.abs(cache.lon - lon) > 0.01) return null;
        return cache;
    } catch (e) { return null; }
}

function _saveWeatherCache(lat, lon, data) {
    try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now(), data }));
    } catch (e) { /* quota etc, ignore */ }
}

async function loadWeather(lat, lon, pref, city) {
    console.log(`[Weather] Loading weather for: ${pref} ${city} (${lat}, ${lon})`);
    updateLocationDisplay(pref, city);

    // === キャッシュ即時表示 ===
    const cache = _loadWeatherCache(lat, lon);
    if (cache) {
        const ageMin = Math.round((Date.now() - cache.ts) / 60000);
        console.log(`[Weather] Using cached data (${ageMin}min old) for instant display`);
        try {
            lastWeatherData = cache.data;
            updateCurrentWeather(cache.data);
            updateHourlyTimeline(cache.data);
            updateWeeklyForecast(cache.data);
        } catch (e) { console.warn('[Weather] cache render failed:', e); }
        // 新鮮ならネット取得をスキップ
        if ((Date.now() - cache.ts) < WEATHER_CACHE_MAX_AGE_MS) {
            console.log('[Weather] Cache fresh, skipping network fetch');
            return;
        }
    }

    // === ネット取得（裏で最新化、タイムアウト+リトライ付き） ===
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,apparent_temperature,weather_code,precipitation`
        + `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability`
        + `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code,precipitation_probability_max`
        + `&timezone=auto&forecast_days=8&past_days=1`;

    async function _fetchWithTimeout(url, timeoutMs) {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
            return r;
        } finally { clearTimeout(tid); }
    }

    try {
        let res, lastErr;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Weather] fetch attempt ${attempt}/3`);
                res = await _fetchWithTimeout(apiUrl, 8000);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                break;
            } catch (err) {
                lastErr = err;
                console.warn(`[Weather] attempt ${attempt} failed:`, err.message || err.name);
                if (attempt < 3) await new Promise(r => setTimeout(r, 400 * attempt));
            }
        }
        if (!res || !res.ok) throw lastErr || new Error('all attempts failed');
        const data = await res.json();

        console.log('[Weather] Data fetched successfully. Updating UI...');
        lastWeatherData = data;
        _saveWeatherCache(lat, lon, data);
        updateCurrentWeather(data);
        updateHourlyTimeline(data);
        updateWeeklyForecast(data);

        // クラウドへ自動同期
        syncWeatherToCloud(data);
    } catch(e) {
        console.error('[Weather] Failed to load weather:', e);
        // キャッシュ表示済みなら触らない
        if (!cache) {
            const descEl = document.getElementById('weather-desc');
            if (descEl) descEl.textContent = '取得失敗';
            const tempEl = document.getElementById('current-temp');
            if (tempEl) tempEl.textContent = '--°C';
        } else {
            console.log('[Weather] Network failed but cache is shown, ignoring');
        }
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

// updateCurrentWeather は DOM 描画のみのため js/headerView.js へ分離。

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

    const lv = getThermalLevel(adjustedTemp);
    let category = 'mild';
    if (lv <= 3)      category = 'cold'; // 10度以下
    else if (lv <= 5) category = 'mild'; // 10〜20度
    else if (lv <= 7) category = 'warm'; // 20〜30度
    else              category = 'hot';  // 30度超

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
        thermalLevel: lv,
        title: baseOutfit.title,
        desc: `${baseOutfit.desc} ${addOnDesc}`,
        img: mainImg,
        items: modifiedItems,
        isNight: (isNight || isEvening),
        visualPrompt: visualPrompt
    };
}

// 状態は var で宣言してクラシックスクリプト間で共有 (homeView.js / outfitDetail.js が参照)
var hourlySuggestions = [];
var currentSelectedIndex = 0;

// selectSuggestion / createHeaderItemElement / updateHourlyTimeline /
// applyOutfitMeta / applySceneImages / __setRefreshBtnBusy は
// 全て DOM 描画のため js/homeView.js へ分離。
// (旧 createHeaderItemElement は未使用だったため削除)


// ハブリッド・ボトムシート（詳細表示）の制御
// 部位英語キー→日本語ラベル＋絵文字（詳細ビュー表示用）
// var で宣言（スクリプト2回読み込み時の SyntaxError 回避）
var _PART_LABEL_MAP = window._PART_LABEL_MAP || {
    head:      { jp: '頭まわり', icon: '🎩' },
    face:      { jp: '顔まわり', icon: '🕶️' },
    ear:       { jp: '耳',     icon: '👂' },
    neck:      { jp: '首まわり', icon: '🧣' },
    inner:     { jp: 'インナー', icon: '👕' },
    outer:     { jp: 'アウター', icon: '🧥' },
    wrist:     { jp: '手首',    icon: '⌚' },
    finger:    { jp: '手指',    icon: '💍' },
    waist:     { jp: '腰',     icon: '👖' },
    leg:       { jp: 'ボトムス', icon: '👖' },
    ankle:     { jp: '足首',    icon: '🧦' },
    foot:      { jp: '靴',     icon: '👞' },
    hand:      { jp: 'バッグ',  icon: '👜' },
    accessory: { jp: '小物',    icon: '✨' }
};
window._PART_LABEL_MAP = _PART_LABEL_MAP;
// 表示順（重要部位から）
var _PART_DISPLAY_ORDER = window._PART_DISPLAY_ORDER || ['outer','inner','leg','foot','head','face','neck','ankle','waist','wrist','finger','hand','accessory','ear'];
window._PART_DISPLAY_ORDER = _PART_DISPLAY_ORDER;

// openOutfitDetail / closeOutfitDetail / openCurrentOutfitDetail は
// 純粋な DOM 操作のため js/outfitDetail.js へ分離。


// updateWeeklyForecast / expandFlexCard / refreshWeeklyData は
// 新レイアウト(Home スタイル Main+Sub)対応のため js/weekly.js に移管済み。
// 重複定義がここに残ると古い weekly-grid を探して silent failure するので削除した。

// 天気データの取得を開始
window.addEventListener('sectionsLoaded', () => {
    initWeather();
    // 即座にキャッシュ済みのシーン画像を反映、その後最新を取りに行く
    fetchAndApplySceneImages();
});

/**
 * スプレッドシート抽出用の予報サマリーを取得 (8-11行目用)
 */
function getWeatherForecastSummary() {
    if (!lastWeatherData || !lastWeatherData.hourly) return null;
    
    const profile = getUserProfile();
    const p = profile.personalize || {};
    
    // 個人差のマッピング
    const sensitivityMap = {
        '極度の寒がり': -2,
        '寒がり': -1,
        '普通': 0,
        '暑がり': 1,
        '極度の暑がり': 2
    };
    const adjustment = sensitivityMap[p.temp_sensitivity] || 0;

    const now = new Date();
    const nowHour = now.getHours();
    const times = lastWeatherData.hourly.time;
    const apparentTemps = lastWeatherData.hourly.apparent_temperature || lastWeatherData.hourly.temperature_2m;
    const codes = lastWeatherData.hourly.weather_code;
    
    const startIndex = times.findIndex(t => {
        const d = new Date(t);
        return d.getFullYear() === now.getFullYear() && d.getHours() >= nowHour;
    });
    
    if (startIndex < 0) return null;
    
    // 現在・+3h・+6h・+12h の4時点
    const offsets = [0, 3, 6, 12];
    const forecastData = [];

    offsets.forEach((offset) => {
        const idx = startIndex + offset;
        if (idx < apparentTemps.length) {
            const t = Math.round(apparentTemps[idx]);
            const hour = new Date(times[idx]).getHours();
            const timeLabel = offset === 0 ? `現在 (${hour}:00)` : `+${offset}h (${hour}:00)`;
            const thermalLevel = getThermalLevel(t); // 感度補正なしの素のLv
            const weatherDesc = (codes && codes[idx] !== undefined)
                ? getWeatherInfo(codes[idx]).desc
                : '';

            // [時刻ラベル, 体感気温(数値), 服装レベル(1-10), 天気(日本語)]
            forecastData.push([timeLabel, t, thermalLevel, weatherDesc]);
        }
    });

    return forecastData;
}

// 直近の同期時刻（多重起動防止）
let __lastWeatherSyncAt = 0;
const __WEATHER_SYNC_COOLDOWN_MS = 30 * 1000; // 30秒

/**
 * GAS からシーン画像URLを取得し、ホームページの画像に反映
 * - localStorage キャッシュを先に適用（瞬時表示）
 * - そのあと GAS から最新を取りに行って差し替え
 */
async function fetchAndApplySceneImages() {
    console.log('[SceneFetch] start');
    if (typeof WOW_CONFIG === 'undefined' || !WOW_CONFIG.cloudUrl) {
        console.warn('[SceneFetch] WOW_CONFIG.cloudUrl missing');
        return;
    }
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const userId = profile.handle || 'unknown';
    console.log('[SceneFetch] userId =', userId);
    if (!userId || userId === 'unknown') {
        console.warn('[SceneFetch] handle is unknown, abort');
        return;
    }

    const cacheKey = 'kion_scene_images_' + userId;

    // 1) キャッシュ即時適用
    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && Array.isArray(cached.scenes) && cached.scenes.length === 4) {
            console.log('[SceneFetch] applying cached scenes', cached.scenes);
            applySceneImages(cached.scenes);
            applyOutfitMeta(cached);
        } else {
            console.log('[SceneFetch] no cache for', cacheKey);
        }
    } catch (e) {
        console.warn('[SceneFetch] cache parse error', e);
    }

    // 2) GASから最新取得
    try {
        const url = `${WOW_CONFIG.cloudUrl}?action=scenes`
                  + `&apiKey=${encodeURIComponent(WOW_CONFIG.apiKey)}`
                  + `&user_id=${encodeURIComponent(userId)}`;
        console.log('[SceneFetch] GET', url);
        const resp = await fetch(url, { method: 'GET', redirect: 'follow' });
        console.log('[SceneFetch] response status', resp.status, resp.ok);
        if (!resp.ok) {
            console.warn('[SceneFetch] non-OK response');
            return;
        }
        const data = await resp.json();
        console.log('[SceneFetch] data', data);
        if (data && data.success && Array.isArray(data.scenes)) {
            const hasAny = data.scenes.some(u => u && typeof u === 'string' && u.startsWith('http'));
            console.log('[SceneFetch] hasAny URLs?', hasAny, data.scenes);
            if (hasAny) {
                // フェーズ4: outfit_names / one_points / feels_temps も同梱でキャッシュ
                // 詳細ビュー用に parts (14部位コーデ) も保存
                const cachePayload = {
                    scenes: data.scenes,
                    outfit_names: data.outfit_names || [],
                    one_points: data.one_points || [],
                    feels_temps: data.feels_temps || [],
                    parts: data.parts || [],
                    ts: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
                applySceneImages(data.scenes);
                applyOutfitMeta(cachePayload);
                console.log('[SceneFetch] applied fresh scenes + meta');
            } else {
                console.warn('[SceneFetch] all scenes are null/invalid');
            }
        } else {
            console.warn('[SceneFetch] data.success=false or missing scenes', data);
        }
    } catch (e) {
        console.warn('[SceneFetch] fetch failed:', e);
    }
}

/**
 * フェーズ4: シート U/V/B列(outfit_name / one_point / feels_temp) を

async function syncWeatherToCloud(data, opts) {
    opts = opts || {};
    const regenerateOutfits = opts.regenerateOutfits === true;
    const skipCooldown = opts.skipCooldown === true || regenerateOutfits;

    const __now = Date.now();
    if (!skipCooldown && __now - __lastWeatherSyncAt < __WEATHER_SYNC_COOLDOWN_MS) {
        console.log('[Weather] Sync skipped (cooldown, last was ' +
            Math.round((__now - __lastWeatherSyncAt) / 1000) + 's ago)');
        return;
    }
    __lastWeatherSyncAt = __now;

    console.log('[Weather] Starting cloud sync', regenerateOutfits ? '(WITH outfit regeneration)' : '(forecast only)');
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const userId = profile.handle || 'unknown';

    const forecastData = getWeatherForecastSummary();
    if (!forecastData) return;

    const syncData = {
        user_id: userId,
        forecast_data: forecastData,
        regenerate_outfits: regenerateOutfits
    };

    if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(res => {
            console.log('[Weather] Sync success:', res);
            fetchAndApplySceneImages();
        }).withFailureHandler(err => console.error('[Weather] Sync error:', err))
          .syncWeatherData(syncData);
    } else if (typeof WOW_CONFIG !== 'undefined' && WOW_CONFIG.cloudUrl) {
        const payload = JSON.stringify({
            apiKey: WOW_CONFIG.apiKey,
            type: 'weather_v2',
            data: syncData
        });
        fetch(WOW_CONFIG.cloudUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload });
        // コーデ再生成時のみポーリング開始（予報のみなら不要）
        if (regenerateOutfits) {
            startSceneImagePolling();
        }
    }
}

async function manualRegenerateOutfits() {
    console.log('[Weather] Manual outfit regeneration triggered');
    if (!lastWeatherData) {
        alert('天気データがまだ取得できていません。少し待ってからもう一度試してください。');
        return;
    }
    __setRefreshBtnBusy(true);

    await syncWeatherToCloud(lastWeatherData, { regenerateOutfits: true, skipCooldown: true });

    // フェイルセーフ: 3分経ってもポーリングが解放しなければ強制解放
    setTimeout(() => __setRefreshBtnBusy(false), 3 * 60 * 1000);
}

// グローバル公開
window.manualRegenerateOutfits = manualRegenerateOutfits;

// ポーリング状態の管理（多重起動防止）
let __scenePollingTimer = null;
let __scenePollAttempts = 0;
const __SCENE_POLL_INTERVAL_MS = 8 * 1000;       // 8秒ごと
const __SCENE_POLL_MAX_ATTEMPTS = 22;            // 最大22回 ≒ 3分弱
const __SCENE_POLL_INITIAL_DELAY_MS = 25 * 1000; // 最初の25秒は同期中なのでスキップ

function startSceneImagePolling() {
    // 既存ポーリングがあればキャンセル
    if (__scenePollingTimer) {
        clearTimeout(__scenePollingTimer);
        __scenePollingTimer = null;
    }
    __scenePollAttempts = 0;
    console.log('[ScenePoll] starting');

    // 初回は同期完了見込みの25秒後
    __scenePollingTimer = setTimeout(__scenePollTick, __SCENE_POLL_INITIAL_DELAY_MS);
}

async function __scenePollTick() {
    __scenePollAttempts++;
    console.log('[ScenePoll] attempt', __scenePollAttempts);

    const ready = await __scenePollFetchOnce();
    if (ready) {
        console.log('[ScenePoll] READY - stopping');
        __scenePollingTimer = null;
        if (typeof __setRefreshBtnBusy === 'function') __setRefreshBtnBusy(false);
        return;
    }
    if (__scenePollAttempts >= __SCENE_POLL_MAX_ATTEMPTS) {
        console.warn('[ScenePoll] max attempts reached - stopping');
        __scenePollingTimer = null;
        if (typeof __setRefreshBtnBusy === 'function') __setRefreshBtnBusy(false);
        return;
    }
    __scenePollingTimer = setTimeout(__scenePollTick, __SCENE_POLL_INTERVAL_MS);
}

// 1回ぶんの取得 → ready なら true を返す
async function __scenePollFetchOnce() {
    if (typeof WOW_CONFIG === 'undefined' || !WOW_CONFIG.cloudUrl) return true; // 何もできないので止める
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const userId = profile.handle || 'unknown';
    if (!userId || userId === 'unknown') return true;

    try {
        const url = `${WOW_CONFIG.cloudUrl}?action=scenes`
                  + `&apiKey=${encodeURIComponent(WOW_CONFIG.apiKey)}`
                  + `&user_id=${encodeURIComponent(userId)}`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!resp.ok) return false;
        const data = await resp.json();
        if (data && data.success && data.ready && Array.isArray(data.scenes)) {
            const hasAll = data.scenes.length === 4 && data.scenes.every(u => u && typeof u === 'string' && u.startsWith('http'));
            if (hasAll) {
                const cacheKey = 'kion_scene_images_' + userId;
                localStorage.setItem(cacheKey, JSON.stringify({ scenes: data.scenes, ts: Date.now(), generatedAt: data.generatedAt }));
                applySceneImages(data.scenes);
                return true;
            }
        }
        return false;
    } catch (e) {
        console.warn('[ScenePoll] fetch failed:', e);
        return false;
    }
}
