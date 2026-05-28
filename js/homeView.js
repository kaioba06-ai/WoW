// Home タブの 4スロットグリッド + メインカード + リフレッシュボタンの DOM 描画。
// 元は js/weather.js に同居。Logic Engine の責務外なので分離。
// 状態 hourlySuggestions / currentSelectedIndex は weather.js が var で公開しており、
// 全クラシックスクリプトから共有される。
// 依存ロジック: getWeatherInfo / getBestOutfit (weather.js)

function selectSuggestion(index) {
    currentSelectedIndex = index;
    const data = hourlySuggestions[index];
    if (!data) return;

    const imgEl = document.getElementById('suggest-img-0');
    const titleEl = document.getElementById('suggest-title-0');
    const descEl = document.getElementById('suggest-desc-0');

    const sheetMeta = (function() {
        try {
            const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
            const userId = profile.handle || 'unknown';
            if (userId === 'unknown') return null;
            const cached = JSON.parse(localStorage.getItem('kion_scene_images_' + userId) || 'null');
            if (!cached) return null;
            return {
                sceneUrl:    Array.isArray(cached.scenes)       ? cached.scenes[index]       : null,
                outfitName:  Array.isArray(cached.outfit_names) ? cached.outfit_names[index] : null,
                onePoint:    Array.isArray(cached.one_points)   ? cached.one_points[index]   : null,
                feelsTemp:   Array.isArray(cached.feels_temps)  ? cached.feels_temps[index]  : null
            };
        } catch (_) { return null; }
    })();

    const aiUrl = sheetMeta && sheetMeta.sceneUrl && typeof sheetMeta.sceneUrl === 'string' && sheetMeta.sceneUrl.startsWith('http')
        ? sheetMeta.sceneUrl : null;

    if (imgEl) {
        imgEl.src = aiUrl || data.meta.img;
        imgEl.onerror = () => {
            imgEl.src = "https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=800";
            imgEl.onerror = null;
        };
    }
    if (titleEl) titleEl.textContent = (sheetMeta && sheetMeta.outfitName) || data.meta.title;
    if (descEl)  descEl.textContent  = (sheetMeta && sheetMeta.onePoint)   || data.meta.desc;

    const emojiEl    = document.getElementById('suggest-weather-emoji');
    const timeEl     = document.getElementById('suggest-time-label');
    const apparentEl = document.getElementById('suggest-apparent-temp');

    if (emojiEl)    emojiEl.textContent    = data.weather.emoji;
    if (timeEl)     timeEl.textContent     = data.dateString;
    if (apparentEl) {
        const t = (sheetMeta && sheetMeta.feelsTemp !== null && sheetMeta.feelsTemp !== undefined && sheetMeta.feelsTemp !== '')
            ? sheetMeta.feelsTemp : data.apparentTemp;
        apparentEl.textContent = `${t}°`;
    }

    const mainCard = document.getElementById('grid-card-main');
    if (mainCard) {
        if (data.meta.isNight) {
            mainCard.classList.add('night-mode-card');
        } else {
            mainCard.classList.remove('night-mode-card');
        }
    }

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

    if (mainCard) {
        if (index === 0) {
            mainCard.classList.add('ring-2', 'ring-primary', 'dark:ring-blue-400');
        } else {
            mainCard.classList.remove('ring-2', 'ring-primary', 'dark:ring-blue-400');
        }
    }
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
        const isSameDay = d.getFullYear() === now.getFullYear() &&
                          d.getMonth() === now.getMonth() &&
                          d.getDate() === now.getDate();
        return isSameDay && d.getHours() >= nowHour;
    });
    if (startIndex < 0) {
        console.warn(`[Weather] Could not find forecast for ${now.toLocaleDateString()} ${nowHour}:00. Fallback to index 0.`);
    }
    const safeStartIndex = startIndex < 0 ? 0 : startIndex;

    const targetOffsets = [0, 3, 4, 12];
    hourlySuggestions = [];

    targetOffsets.forEach((offset, i) => {
        const idx = safeStartIndex + offset;
        if (idx >= times.length) return;

        const temp = Math.round(temps[idx]);
        const apparentTemp = Math.round(apparentTemps[idx] || temp);
        const weatherInfo = getWeatherInfo(codes[idx]);
        const d = new Date(times[idx]);
        const hour = d.getHours();
        const hh = String(hour).padStart(2, '0');

        const isNowLocal = offset === 0;
        const dateString = isNowLocal ? 'NOW' : `${hh}:00`;
        const contextLabel = isNowLocal ? 'NOW' : `${hh}:00`;

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
            let imgSrc = bestOutfit.img;
            try {
                const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
                const userId = profile.handle || 'unknown';
                if (userId !== 'unknown') {
                    const cached = JSON.parse(localStorage.getItem('kion_scene_images_' + userId) || 'null');
                    const aiUrl = cached && Array.isArray(cached.scenes) ? cached.scenes[i] : null;
                    if (aiUrl && typeof aiUrl === 'string' && aiUrl.startsWith('http')) {
                        imgSrc = aiUrl;
                    }
                }
            } catch (_) { /* fall through to static */ }
            imgEl.src = imgSrc;
            imgEl.onerror = () => {
                imgEl.src = "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=400";
                imgEl.onerror = null;
            };
            imgEl.classList.remove('opacity-0');
            if (imgEl.parentElement) imgEl.parentElement.classList.remove('skeleton');
        }

        if (leftEl && rightEl) {
            const badgeOverlay = leftEl.parentElement;
            if (badgeOverlay) badgeOverlay.classList.remove('hidden');
            leftEl.classList.remove('hidden');
            rightEl.classList.remove('hidden');
            if (iconEl) iconEl.classList.remove('hidden');

            const timeSpan = leftEl.querySelector('span');
            if (timeSpan) timeSpan.textContent = dateString;

            const tempSpan = rightEl.querySelector('span');
            if (tempSpan) tempSpan.textContent = `${apparentTemp}°`;

            if (iconEl) iconEl.textContent = weatherInfo.emoji;

            const gridOverlay = document.getElementById(`grid-overlay-${i}`);
            if (gridOverlay) gridOverlay.classList.remove('opacity-0');
        }
    });

    if (hourlySuggestions.length > 0) {
        selectSuggestion(0);
    }
}

function applyOutfitMeta(data) {
    if (!data) return;
    const names = Array.isArray(data.outfit_names) ? data.outfit_names : [];
    const points = Array.isArray(data.one_points) ? data.one_points : [];
    const temps = Array.isArray(data.feels_temps) ? data.feels_temps : [];

    if (Array.isArray(hourlySuggestions)) {
        for (let i = 0; i < Math.min(4, hourlySuggestions.length); i++) {
            const s = hourlySuggestions[i];
            if (!s || !s.meta) continue;
            if (names[i])  s.meta.title = names[i];
            if (points[i]) s.meta.desc  = points[i];
            if (temps[i] !== null && temps[i] !== undefined && temps[i] !== '') {
                s.apparentTemp = temps[i];
            }
        }
    }

    const idx = (typeof currentSelectedIndex === 'number') ? currentSelectedIndex : 0;
    if (names[idx]) {
        const el = document.getElementById('suggest-title-0');
        if (el) el.textContent = names[idx];
    }
    if (points[idx]) {
        const el = document.getElementById('suggest-desc-0');
        if (el) el.textContent = points[idx];
    }
    if (temps[idx] !== null && temps[idx] !== undefined && temps[idx] !== '') {
        const el = document.getElementById('suggest-apparent-temp');
        if (el) el.textContent = `${temps[idx]}°`;
    }
}

function applySceneImages(scenes) {
    if (!Array.isArray(scenes)) return;
    const setImg = (el, url) => {
        if (!el) return;
        el.onerror = () => {
            console.warn('[Weather] AI scene image load failed:', url);
            el.onerror = null;
        };
        el.src = url;
        el.classList.remove('opacity-0');
        if (el.parentElement) el.parentElement.classList.remove('skeleton');
    };
    for (let i = 0; i < 4; i++) {
        const url = scenes[i];
        if (!url || typeof url !== 'string' || !url.startsWith('http')) continue;
        setImg(document.getElementById(`grid-img-${i}`), url);
    }
    const idx = (typeof currentSelectedIndex === 'number') ? currentSelectedIndex : 0;
    const mainUrl = scenes[idx];
    if (mainUrl && typeof mainUrl === 'string' && mainUrl.startsWith('http')) {
        setImg(document.getElementById('suggest-img-0'), mainUrl);
    }
}

function __setRefreshBtnBusy(busy) {
    const btn = document.getElementById('refresh-outfits-btn');
    if (!btn) return;
    if (busy) {
        btn.dataset.busy = 'true';
        btn.classList.add('opacity-50', 'pointer-events-none');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');
    } else {
        btn.dataset.busy = 'false';
        btn.classList.remove('opacity-50', 'pointer-events-none');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.remove('animate-spin');
    }
}
