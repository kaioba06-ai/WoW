// Outfit detail モーダル (home.html の詳細ビュー)。
// 元は js/weather.js に同居していたが、Logic Engine の責務外なので分離。
// 依存: hourlySuggestions / currentSelectedIndex / _PART_DISPLAY_ORDER / _PART_LABEL_MAP
//      (いずれも weather.js が同一スクリプト realm の script-scope または window に露出)

function openOutfitDetail(index) {
    const list = (typeof hourlySuggestions !== 'undefined') ? hourlySuggestions : [];
    const data = list[index] || {
        meta: { title: '--', desc: '--', img: null },
        weather: { emoji: '🌤️', desc: '' },
        dateString: '',
        apparentTemp: '--'
    };

    const overlay = document.getElementById('outfit-detail-overlay');
    const modal = document.getElementById('outfit-detail-modal');
    const scrollContainer = document.getElementById('outfit-detail-scroll-container');

    const sheetMeta = (function() {
        try {
            const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
            const userId = profile.handle || 'unknown';
            if (userId === 'unknown') return null;
            const cached = JSON.parse(localStorage.getItem('kion_scene_images_' + userId) || 'null');
            if (!cached) return null;
            return {
                sceneUrl:   Array.isArray(cached.scenes)       ? cached.scenes[index]       : null,
                outfitName: Array.isArray(cached.outfit_names) ? cached.outfit_names[index] : null,
                onePoint:   Array.isArray(cached.one_points)   ? cached.one_points[index]   : null,
                feelsTemp:  Array.isArray(cached.feels_temps)  ? cached.feels_temps[index]  : null,
                parts:      Array.isArray(cached.parts)        ? cached.parts[index]        : null
            };
        } catch (_) { return null; }
    })();

    const heroUrl = (sheetMeta && sheetMeta.sceneUrl && sheetMeta.sceneUrl.startsWith('http'))
        ? sheetMeta.sceneUrl : (data.meta && data.meta.img);
    const heroEl = document.getElementById('detail-hero-img');
    if (heroEl && heroUrl) {
        heroEl.src = heroUrl;
        heroEl.onerror = () => {
            heroEl.src = 'https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=800';
            heroEl.onerror = null;
        };
    }

    const titleEl = document.getElementById('detail-title');
    if (titleEl) titleEl.textContent = (sheetMeta && sheetMeta.outfitName) || data.meta.title || '--';
    const tempEl = document.getElementById('detail-weather-temp');
    if (tempEl) {
        const t = (sheetMeta && sheetMeta.feelsTemp != null && sheetMeta.feelsTemp !== '') ? sheetMeta.feelsTemp : data.apparentTemp;
        tempEl.textContent = `${t}°`;
    }
    const emojiEl = document.getElementById('detail-weather-emoji');
    const descEl  = document.getElementById('detail-weather-desc');
    const timeEl  = document.getElementById('detail-time-label');
    if (emojiEl) emojiEl.textContent = data.weather.emoji;
    if (descEl)  descEl.textContent  = data.weather.desc;
    if (timeEl)  timeEl.textContent  = data.dateString;
    const precipEl = document.getElementById('detail-weather-precip');
    if (precipEl) precipEl.textContent = '0%';

    const noteEl = document.getElementById('detail-desc');
    if (noteEl) {
        noteEl.textContent = (sheetMeta && sheetMeta.onePoint) || data.meta.desc || '--';
    }

    const partsList = document.getElementById('detail-parts-list');
    const partsSection = document.getElementById('detail-outfit-section');
    if (partsList) partsList.innerHTML = '';
    const parts = sheetMeta && sheetMeta.parts;
    let hasAny = false;
    const order = window._PART_DISPLAY_ORDER || [];
    const labels = window._PART_LABEL_MAP || {};
    if (partsList && parts && typeof parts === 'object') {
        order.forEach(key => {
            const val = parts[key];
            if (!val || String(val).trim() === '' || String(val).trim() === '-') return;
            hasAny = true;
            const labelInfo = labels[key] || { jp: key, icon: '•' };
            const row = document.createElement('div');
            row.className = 'flex items-start gap-3 py-2 border-b border-black/5 dark:border-white/10 last:border-b-0';
            row.innerHTML = `
                <span class="text-[18px] leading-none mt-0.5 shrink-0">${labelInfo.icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 dark:text-white/40">${labelInfo.jp}</p>
                    <p class="text-[12px] font-bold text-on-surface dark:text-white leading-snug mt-0.5">${val}</p>
                </div>
            `;
            partsList.appendChild(row);
        });
    }
    if (partsSection) {
        partsSection.style.display = hasAny ? '' : 'none';
    }

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
    const idx = (typeof currentSelectedIndex !== 'undefined') ? currentSelectedIndex : 0;
    openOutfitDetail(idx);
}
