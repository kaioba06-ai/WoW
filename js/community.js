// ===== アプリ設定（演出・バイブレーション） =====
const _SETTINGS_KEY = 'kion_settings';
const kionSettings = Object.assign(
    { isFullScreenEffectEnabled: true, isHapticEnabled: true },
    JSON.parse(localStorage.getItem(_SETTINGS_KEY) || '{}')
);
function _saveSettings() { localStorage.setItem(_SETTINGS_KEY, JSON.stringify(kionSettings)); }
function toggleSetting(key) {
    kionSettings[key] = !kionSettings[key];
    _saveSettings();
    _syncSettingsUI();
}
function _syncSettingsUI() {
    const effectBtn  = document.getElementById('effect-mode-toggle');
    const hapticBtn  = document.getElementById('haptic-toggle');
    if (effectBtn) {
        const on  = kionSettings.isFullScreenEffectEnabled;
        const lbl = effectBtn.nextElementSibling;
        effectBtn.querySelector('.toggle-knob').style.transform = on ? 'translateX(28px)' : 'translateX(0)';
        if (lbl) lbl.textContent = on ? 'フルスクリーン' : 'カードのみ';
        effectBtn.style.background = on ? '#0060ad' : '#cbd5e1';
    }
    if (hapticBtn) {
        const on  = kionSettings.isHapticEnabled;
        const lbl = hapticBtn.nextElementSibling;
        hapticBtn.querySelector('.toggle-knob').style.transform = on ? 'translateX(28px)' : 'translateX(0)';
        if (lbl) lbl.textContent = on ? 'ON' : 'OFF';
        hapticBtn.style.background = on ? '#0060ad' : '#cbd5e1';
    }
}

// ===== コミュニティ・投稿モーダル・フィルター =====

function switchCommunityTab(tab) {
    if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);

    // Vueエコシステムとの接続: もし新しいVueコンテナの切り替え関数があればそちらに完全委譲
    if (typeof window.switchCommunityTabVue === 'function') {
        window.switchCommunityTabVue(tab);
        return;
    }

    // Fallback for old DOM if Vue is not ready or missing
    const discoverMain = document.getElementById('discover-main');
    const trendingView = document.getElementById('community-app');
    const qaView       = document.getElementById('discover-qa');

    if (discoverMain) discoverMain.classList.toggle('hidden', tab !== 'discover');
    if (trendingView) trendingView.classList.toggle('hidden', tab !== 'trending');
    if (qaView) qaView.classList.toggle('hidden', tab !== 'qa');

    const ACTIVE   = 'flex-1 py-3 border-b-2 border-black dark:border-white text-black dark:text-white font-black text-[10px] tracking-[0.18em] uppercase text-center transition-all';
    const INACTIVE = 'flex-1 py-3 border-b border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 font-bold text-[10px] tracking-[0.18em] uppercase text-center hover:text-black/60 dark:hover:text-white/60 transition-all';

    const tabDiscover = document.getElementById('tab-btn-discover');
    const tabTrending = document.getElementById('tab-btn-trending');
    const tabQa       = document.getElementById('tab-btn-qa');
    if(tabDiscover) tabDiscover.className = tab === 'discover' ? ACTIVE : INACTIVE;
    if(tabTrending) tabTrending.className = tab === 'trending' ? ACTIVE : INACTIVE;
    if(tabQa) tabQa.className      = tab === 'qa' ? ACTIVE : INACTIVE;
}

function bindAndroidTouchFixes() {
    const container = document.getElementById('page-discover');
    if (!container) return;
    container.querySelectorAll('button, [role="button"], .comm-tab, .genre-pill, .ctx-pill, .temp-btn, .tag-btn, .nav-btn, .closet-save-btn, .postcard-wrapper, .instant-flow-btn, .adapt-btn, .closet-panel-toggle').forEach(el => {
        el.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
    });
}

// ===== スマートフィルター =====
// genre:    ジャンル別フィルター（ストリート、カジュアル等）
const filterState = { scene: 'すべて', temp: '15mid', purpose: null, genre: null };

function toggleFilterSheet() {
    const sheet   = document.getElementById('filter-bottom-sheet');
    const overlay = document.getElementById('filter-sheet-overlay');
    const body    = document.getElementById('filter-sheet-body');
    const isHidden = sheet.classList.contains('hidden');

    if(isHidden) {
        sheet.classList.remove('hidden');
        sheet.classList.add('flex');
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            body.style.transform  = 'translateY(0)';
        });
        document.body.style.overflow = 'hidden';
    } else {
        overlay.style.opacity = '0';
        body.style.transform  = 'translateY(100%)';
        setTimeout(() => {
            sheet.classList.add('hidden');
            sheet.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }
}

function toggleSheetFilter(btn, group) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    document.querySelectorAll(`.${group}`).forEach(b => {
        b.classList.remove('bg-primary','text-white','shadow-sm','ring-2','ring-primary/30');
        b.classList.add('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
    });
    btn.classList.add('bg-primary','text-white','shadow-sm');
    btn.classList.remove('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
    const key = group.replace('sheet-', '');
    // data-value="" はオプション未選択（null）として扱う
    filterState[key] = btn.dataset.value || null;
}

function applyFilters() {
    const hasFilter = filterState.scene !== 'すべて'
        || filterState.genre !== null
        || filterState.purpose !== null;
    document.getElementById('filter-dot').classList.toggle('hidden', !hasFilter);
    filterTrendCards();
    renderActiveFilterTags();
    toggleFilterSheet();
}

// ===== トレンドカードのフィルタリング =====
function filterTrendCards() {
    const trendGrid = document.querySelector('#discover-trend .grid');
    if (!trendGrid) return;
    const addCard = Array.from(trendGrid.children).find(el => el.classList.contains('add-post-card')) || trendGrid.lastElementChild;
    const posts = Array.from(trendGrid.children).filter(el => el !== addCard && (el.dataset.postedAt !== undefined || el.dataset.postId !== undefined));

    posts.forEach(card => {
        let visible = true;

        // シーン（TPO）フィルター
        if (filterState.scene && filterState.scene !== 'すべて') {
            if ((card.dataset.scene || '') !== filterState.scene) visible = false;
        }

        // ジャンルフィルター（AND条件）
        if (filterState.genre) {
            if ((card.dataset.genre || '') !== filterState.genre) visible = false;
        }

        card.style.display = visible ? '' : 'none';
    });

    sortTrendPosts();
}

// ===== アクティブフィルタータグの描画（discover.html 上部に表示） =====
function renderActiveFilterTags() {
    const container = document.getElementById('active-filter-tags');
    if (!container) return;

    const tags = [];
    if (filterState.scene && filterState.scene !== 'すべて') tags.push({ key: 'scene',    label: `🗺️ ${filterState.scene}` });
    if (filterState.genre)                                   tags.push({ key: 'genre',    label: `🎨 ${filterState.genre}` });
    if (filterState.purpose)                                 tags.push({ key: 'purpose',  label: `🔄 ${filterState.purpose}` });

    if (tags.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = tags.map(t => `
        <button onclick="removeFilter('${t.key}')"
            class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-blue-500/20 text-primary dark:text-blue-300 text-[10px] font-bold border border-primary/20 dark:border-blue-500/30 active:scale-95 transition-transform">
            ${t.label}
            <span class="material-symbols-outlined text-[12px]">close</span>
        </button>`).join('');
}

// 個別フィルター解除（タグの × ボタンから呼ばれる）
function removeFilter(key) {
    if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    if (key === 'scene') {
        filterState.scene = 'すべて';
        document.querySelectorAll('.sheet-scene').forEach(b => {
            b.classList.remove('bg-primary','text-white','shadow-sm');
            b.classList.add('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
        });
        const allBtn = document.querySelector('.sheet-scene[data-value="すべて"]');
        if (allBtn) {
            allBtn.classList.add('bg-primary','text-white','shadow-sm');
            allBtn.classList.remove('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
        }
    } else {
        filterState[key] = null;
        document.querySelectorAll(`.sheet-${key}`).forEach(b => {
            b.classList.remove('bg-primary','text-white','shadow-sm');
            b.classList.add('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
        });
    }

    const hasFilter = filterState.scene !== 'すべて'
        || filterState.genre !== null
        || filterState.purpose !== null;
    document.getElementById('filter-dot').classList.toggle('hidden', !hasFilter);
    filterTrendCards();
    renderActiveFilterTags();
}

// Vibe バナー → genre/scene フィルターに連動（alert 廃止）
const VIBE_MAP = {
    'Tokyo Night':    { scene: 'フェス',  genre: 'ストリート' },
    'Office Minimal': { scene: 'オフィス', genre: 'ミニマル'   },
    'Cafe Casual':    { scene: 'カフェ',  genre: 'カジュアル'  },
    'Street Mix':     { scene: 'フェス',  genre: 'ストリート'  },
};

function applyVibeFilter(vibe) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10]);
    const map = VIBE_MAP[vibe];
    if (!map) return;

    filterState.scene = map.scene;
    filterState.genre = map.genre;

    // シートボタンを同期
    document.querySelectorAll('.sheet-scene').forEach(b => {
        const active = b.dataset.value === map.scene;
        b.classList.toggle('bg-primary',  active);
        b.classList.toggle('text-white',  active);
        b.classList.toggle('shadow-sm',   active);
        b.classList.toggle('bg-white',   !active);
        b.classList.toggle('dark:bg-slate-800', !active);
        b.classList.toggle('border',     !active);
    });
    document.querySelectorAll('.sheet-genre').forEach(b => {
        const active = b.dataset.value === map.genre;
        b.classList.toggle('bg-primary',  active);
        b.classList.toggle('text-white',  active);
        b.classList.toggle('shadow-sm',   active);
        b.classList.toggle('bg-white',   !active);
        b.classList.toggle('dark:bg-slate-800', !active);
        b.classList.toggle('border',     !active);
    });

    // ジャンルピルも同期
    _syncGenrePills(map.genre);

    filterTrendCards();
    renderActiveFilterTags();
    const hasFilter = document.getElementById('filter-dot');
    if(hasFilter) hasFilter.classList.remove('hidden');
}

// ===== 投稿モーダル =====
let currentModalTab = 'qa';

function openPostModal(tab) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10]);
    const overlay = document.getElementById('post-modal-overlay');
    const modal = document.getElementById('post-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.classList.add('sheet-open');
        modal.classList.remove('sheet-close');
    });
    document.body.style.overflow = 'hidden';
    switchModalTab(tab || 'qa');
}

function closePostModal() {
    const overlay = document.getElementById('post-modal-overlay');
    const modal = document.getElementById('post-modal');
    overlay.style.opacity = '0';
    modal.classList.add('sheet-close');
    modal.classList.remove('sheet-open');
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

function switchModalTab(tab) {
    currentModalTab = tab;
    document.getElementById('modal-form-qa').classList.toggle('hidden', tab !== 'qa');
    document.getElementById('modal-form-trend').classList.toggle('hidden', tab !== 'trend');
    const activeClass = 'flex-1 py-2 rounded-full bg-primary dark:bg-blue-500 text-white text-[11px] font-bold shadow-sm transition-all';
    const inactiveClass = 'flex-1 py-2 rounded-full text-on-surface-variant dark:text-white/60 text-[11px] font-bold transition-all';
    document.getElementById('modal-tab-qa').className = tab === 'qa' ? activeClass : inactiveClass;
    document.getElementById('modal-tab-trend').className = tab === 'trend' ? activeClass : inactiveClass;
}

function selectTemp(el, _val) {
    const form = el.closest('#modal-form-qa, #modal-form-trend');
    form.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('selected-temp'));
    el.classList.add('selected-temp');
}

function toggleTag(el) {
    el.classList.toggle('selected-tag');
}

function getSelectedTemp(formId) {
    const selected = document.querySelector(`#${formId} .temp-btn.selected-temp`);
    return selected ? selected.textContent : '16〜20°C';
}

function getSelectedTags(formId) {
    return Array.from(document.querySelectorAll(`#${formId} .tag-btn.selected-tag`)).map(b => b.textContent);
}

// 文字数カウント（モーダルがDOM済みの場合のみ登録）
const _qaTextEl    = document.getElementById('qa-text');
const _trendTextEl = document.getElementById('trend-text');
if (_qaTextEl) _qaTextEl.addEventListener('input', function() {
    document.getElementById('qa-char').textContent = `${this.value.length} / 200`;
    if(this.value.length > 200) this.value = this.value.slice(0, 200);
});
if (_trendTextEl) _trendTextEl.addEventListener('input', function() {
    document.getElementById('trend-char').textContent = `${this.value.length} / 150`;
    if(this.value.length > 150) this.value = this.value.slice(0, 150);
});

// 写真プレビュー
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('photo-preview-img').src = e.target.result;
        document.getElementById('photo-upload-area').classList.add('hidden');
        document.getElementById('photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-preview-img').src = '';
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('photo-upload-area').classList.remove('hidden');
}

// 投稿送信
function submitPost(type) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10,5,20]);
    if(type === 'qa') {
        const text = document.getElementById('qa-text').value.trim();
        if(!text) { shakeElement(document.getElementById('qa-text')); return; }
        const temp = getSelectedTemp('modal-form-qa');
        const tags = getSelectedTags('modal-form-qa');
        addQaPost(text, temp, tags);
        document.getElementById('qa-text').value = '';
        document.getElementById('qa-char').textContent = '0 / 200';
        document.querySelectorAll('#modal-form-qa .tag-btn').forEach(b => b.classList.remove('selected-tag'));
    } else {
        const text = document.getElementById('trend-text').value.trim();
        const imgSrc = document.getElementById('photo-preview-img').src;
        if(!text && !imgSrc) { shakeElement(document.getElementById('trend-text')); return; }
        const temp = getSelectedTemp('modal-form-trend');
        addTrendPost(text, temp, imgSrc || null);
        document.getElementById('trend-text').value = '';
        document.getElementById('trend-char').textContent = '0 / 150';
        removePhoto();
    }
    closePostModal();
    setTimeout(() => {
        switchTab('discover', document.querySelectorAll('.nav-item')[2]);
        switchCommunityTab(type === 'qa' ? 'qa' : 'trending');
        alert('投稿しました！✨');
    }, 350);
}

function addQaPost(text, temp, tags) {
    const now = 'たった今';
    const tagsHtml = tags.map(t => `<span class="bg-gray-100 dark:bg-slate-700 text-on-surface-variant dark:text-white/60 px-2 py-0.5 rounded-full text-[9px] font-bold">${t}</span>`).join('');
    const card = document.createElement('div');
    card.className = 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[28px] p-5 border border-white/50 dark:border-white/10 shadow-sm space-y-3 animate-[fadeSlideIn_0.4s_ease_forwards]';
    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex gap-3 items-center">
                <div class="w-8 h-8 rounded-full bg-primary/20 dark:bg-blue-500/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[16px] text-primary dark:text-blue-400">person</span>
                </div>
                <div>
                    <p class="font-bold text-xs dark:text-white">Alessandro</p>
                    <p class="text-[9px] text-on-surface-variant dark:text-white/50">${now}</p>
                </div>
            </div>
            <span class="bg-blue-100 dark:bg-blue-900/40 text-primary dark:text-blue-300 px-3 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[12px]">thermostat</span> ${temp}
            </span>
        </div>
        <p class="font-bold text-sm dark:text-white leading-relaxed">${text.replace(/</g,'&lt;')}</p>
        ${tagsHtml ? `<div class="flex gap-1.5 flex-wrap">${tagsHtml}</div>` : ''}
        <button class="bg-white/50 dark:bg-slate-700 px-4 py-2 rounded-xl flex items-center gap-1 text-[10px] font-bold text-primary dark:text-blue-400 border border-white/50 dark:border-white/10 active:scale-95 transition-transform">
            <span class="material-symbols-outlined text-[14px]">add_comment</span> 回答する
        </button>`;
    const qaContainer = document.getElementById('discover-qa');
    qaContainer.insertBefore(card, qaContainer.firstChild);
}

function addTrendPost(text, _temp, imgSrc) {
    const trendGrid = document.querySelector('#discover-trend .grid');
    const addCard = trendGrid.lastElementChild;
    const card = document.createElement('div');
    const dynId = Date.now();
    card.dataset.postedAt  = dynId;
    card.dataset.scene     = selectedPostBg.label !== 'なし' ? selectedPostBg.label : '';
    card.dataset.genre     = '';
    card.className = 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[20px] overflow-hidden border border-white/50 dark:border-white/10 shadow-sm relative group flex flex-col animate-[fadeSlideIn_0.4s_ease_forwards]';
    card.innerHTML = `
        ${imgSrc ? `<div class="relative cursor-pointer"><img class="w-full h-36 object-cover" src="${imgSrc}"/><div class="absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded text-[8px] font-extrabold shadow-md">NEW ✨</div><button onclick="copyToCloset(this,'${imgSrc.replace(/'/g,"\\'")}','${text.replace(/'/g,"\\'").slice(0,20) || 'シェアコーデ'}')" class="save-closet-btn absolute top-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-primary dark:text-blue-400 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border border-white/50"><span class="material-symbols-outlined text-[16px]">hanger</span></button></div>` : ''}
        <div class="px-3 py-2 text-[10px] font-bold dark:text-white/80 text-on-surface-variant leading-snug">${text.replace(/</g,'&lt;')}</div>
        <div class="px-2.5 pt-2 pb-1 space-y-1.5 mt-auto"><span class="text-[9px] font-black text-on-surface-variant dark:text-white/40 tracking-wider">0 CURATIONS</span></div>`;
    trendGrid.insertBefore(card, addCard);
}

let currentSortMode = 'trend';

function setSortMode(mode) {
    if(typeof kionSettings!=='undefined' && kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    currentSortMode = mode;
    const BTN_ON  = 'px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-primary dark:text-blue-300 text-[9px] font-bold shadow-sm transition-all flex items-center gap-1';
    const BTN_OFF = 'px-2.5 py-1 rounded-full text-on-surface-variant dark:text-white/50 text-[9px] font-bold transition-all flex items-center gap-1';
    const trendBtn = document.getElementById('sort-btn-trend');
    const nicheBtn = document.getElementById('sort-btn-niche');
    if (trendBtn) {
        trendBtn.className = mode === 'trend' ? BTN_ON : BTN_OFF;
        trendBtn.innerHTML = `王道 <span class="material-symbols-outlined text-[10px]">${mode === 'trend' ? 'trending_up' : 'trending_up'}</span>`;
    }
    if (nicheBtn) {
        nicheBtn.className = mode === 'niche' ? BTN_ON : BTN_OFF;
        nicheBtn.innerHTML = `個性派 <span class="material-symbols-outlined text-[10px]">${mode === 'niche' ? 'diamond' : 'diamond'}</span>`;
    }
    sortTrendPosts();
}

function sortTrendPosts() {
    const trendGrid = document.querySelector('#discover-trend .grid');
    if(!trendGrid) return;
    const addCard = Array.from(trendGrid.children).find(el => el.classList.contains('add-post-card')) || trendGrid.lastElementChild;
    const posts = Array.from(trendGrid.children).filter(el => el !== addCard && (el.dataset.postedAt !== undefined || el.dataset.postId !== undefined));

    const firstPositions = new Map();
    posts.forEach(p => firstPositions.set(p, p.getBoundingClientRect()));

    if (currentSortMode === 'niche') {
        posts.sort((a, b) => parseInt(a.dataset.postedAt || 0) - parseInt(b.dataset.postedAt || 0));
    } else {
        posts.sort((a, b) => parseInt(b.dataset.postedAt || 0) - parseInt(a.dataset.postedAt || 0));
    }
    posts.forEach(p => trendGrid.insertBefore(p, addCard));

    requestAnimationFrame(() => {
        posts.forEach(p => {
            const first = firstPositions.get(p);
            const last = p.getBoundingClientRect();
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            if (dx || dy) {
                p.animate([
                    { transform: `translate(${dx}px, ${dy}px)` },
                    { transform: 'translate(0, 0)' }
                ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
            }
        });
    });
}


// ===== コミュニティ: フィルタートグル =====
function toggleCommunityFilter(btn, group) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    const isActive = btn.dataset.active === 'true';
    document.querySelectorAll(`.comm-filter-${group}`).forEach(b => {
        b.dataset.active = 'false';
        b.classList.remove('bg-primary','dark:bg-blue-500','text-white','shadow-md');
        b.classList.add('bg-white/60','dark:bg-slate-800/60','dark:text-white/80');
    });
    if(!isActive) {
        btn.dataset.active = 'true';
        btn.classList.add('bg-primary','text-white','shadow-md');
        btn.classList.remove('bg-white/60','dark:bg-slate-800/60','dark:text-white/80');
    }
}

// ===== コミュニティ: 回答フォーム =====
function openReplyForm(btn) {
    const form = btn.closest('.space-y-4, .space-y-3').querySelector('.reply-form');
    if(!form) return;
    form.classList.toggle('hidden');
    if(!form.classList.contains('hidden')) form.querySelector('textarea').focus();
}
function closeReplyForm(btn) {
    btn.closest('.reply-form').classList.add('hidden');
}
function submitReply(btn) {
    const form = btn.closest('.reply-form');
    const text = form.querySelector('textarea').value.trim();
    if(!text) { shakeElement(form.querySelector('textarea')); return; }
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10,5,15]);
    const replyDiv = document.createElement('div');
    replyDiv.className = 'bg-gray-50 dark:bg-slate-700/60 rounded-2xl p-3 border border-gray-100 dark:border-white/10 animate-[fadeSlideIn_0.3s_ease_forwards]';
    replyDiv.innerHTML = `<div class="flex gap-2 items-center mb-1"><div class="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"><span class="material-symbols-outlined text-[11px] text-primary dark:text-blue-400">person</span></div><p class="font-bold text-[10px] dark:text-white">Alessandro</p><p class="text-[8px] text-on-surface-variant dark:text-white/40 ml-auto">たった今</p></div><p class="text-[11px] dark:text-white/90 font-bold leading-relaxed">${text.replace(/</g,'&lt;')}</p>`;
    form.before(replyDiv);
    form.querySelector('textarea').value = '';
    form.classList.add('hidden');
    alert('回答を送信しました！');
}


// コミュニティ投稿をクローゼットにコピー
function copyToCloset(btn, imgSrc, name) {
    if(btn.dataset.saved === '1') {
        alert('このコーデはすでにクローゼットに保存済みです');
        return;
    }
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10, 5, 20]);
    const item = {
        id: Date.now(),
        label: name || 'コミュニティコーデ',
        name: name || 'コミュニティコーデ',
        category: 'other',
        color: '#888888',
        colorName: '',
        memo: 'コミュニティより保存',
        img: imgSrc || '',
        tags: [],
        addedAt: new Date().toLocaleDateString('ja-JP')
    };
    ClosetModule.addItem(item);
    btn.dataset.saved = '1';
    btn.classList.remove('text-primary', 'dark:text-blue-400');
    btn.classList.add('text-emerald-500', 'bg-emerald-50', '!border-emerald-300');
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]" style="font-variation-settings:\'FILL\' 1">check_circle</span>';
    alert(`「${item.label}」をクローゼットに保存しました！`);
}

// ===== コンテキストピル（#CampusStyle 等） =====
function applyContextPill(btn, context) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    // ピルのアクティブ状態
    document.querySelectorAll('.ctx-pill').forEach(b => {
        b.classList.remove('bg-primary','text-white','shadow-sm');
        b.classList.add('bg-white/80','dark:bg-slate-800/80','border','border-black/8','dark:border-white/10','dark:text-white');
    });
    btn.classList.add('bg-primary','text-white','shadow-sm');
    btn.classList.remove('bg-white/80','dark:bg-slate-800/80','border','border-black/8','dark:border-white/10','dark:text-white');

    // カードの data-context で絞り込み
    const grid = document.getElementById('curated-feed-grid');
    if (!grid) return;
    const addCard = grid.querySelector('.add-post-card');
    Array.from(grid.children).filter(el => el !== addCard && (el.dataset.postedAt !== undefined || el.dataset.postId !== undefined)).forEach(card => {
        card.style.display = (!context || card.dataset.context === context) ? '' : 'none';
    });
}



function _initReactionDelegation() { /* removed — Phase ① */ }



function _initDirectionalFlick() { /* removed — Phase ① */ }



// ===== ジャンルピル：クイックジャンルフィルター =====
function quickGenreFilter(genre) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    filterState.genre = genre || null;
    _syncGenrePills(genre);
    filterTrendCards();
    renderActiveFilterTags();
    const hasFilter = filterState.scene !== 'すべて' || filterState.genre !== null;
    document.getElementById('filter-dot')?.classList.toggle('hidden', !hasFilter);
}

function _initGlobalDigInteraction() { /* removed — Phase ① */ }

function _syncGenrePills(genre) {
    document.querySelectorAll('.genre-pill').forEach(b => {
        const isAll   = b.id === 'genre-pill-all';
        const isMatch = genre ? b.textContent.includes(genre) : isAll;
        b.classList.toggle('bg-primary',    isMatch);
        b.classList.toggle('text-white',    isMatch);
        b.classList.toggle('shadow-sm',     isMatch);
        b.classList.toggle('bg-white/70',  !isMatch);
        b.classList.toggle('dark:bg-slate-800/70', !isMatch);
        b.classList.toggle('border',       !isMatch);
        b.classList.toggle('border-white/50', !isMatch);
        b.classList.toggle('dark:border-white/10', !isMatch);
        b.classList.toggle('dark:text-white', !isMatch);
    });
}

// ===== カード詳細：TikTok 式縦スクロールスナップ =====
const _TPO_MSGS = {
    'カフェ':   '☕ カフェでの着こなし：清潔感とリラックス感のバランスが◎。明るめのカラーや素材感のあるアイテムで空間に映えます。',
    'フェス':   '🎵 野外フェスの着こなし：動きやすさが最優先。重ね着で体温調節しやすいレイヤードスタイルがベスト。',
    'オフィス': '💼 オフィスの着こなし：清潔感と機能性を両立。無地や落ち着いたトーンでまとめると好印象です。',
    'デート':   '💑 デートの着こなし：相手より少しだけ華やかに。上品な素材感と程よいドレスアップが好バランス。',
    '公園':     '🌿 公園散歩の着こなし：動きやすさとナチュラル感を大切に。アクティブ映えするスニーカーが鍵。',
    '街':       '🏙️ 街歩きの着こなし：トレンドを取り入れながらも歩きやすさを重視。スニーカーとのバランスが鍵。',
};

function openCardDetail(wrapper) {
    if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);

    const triggerCard = wrapper.closest('[data-posted-at], [data-post-id]');
    if (!triggerCard) return;
    const shell = document.getElementById('tiktok-detail-shell');
    const snapContainer = document.getElementById('card-detail-snap');
    if (!shell || !snapContainer) return;

    if (shell.classList.contains('active')) { closeCardDetail(); return; }

    // 表示中のカードを収集
    const allCards = Array.from(
        document.querySelectorAll('#curated-feed-grid > [data-post-id], #discover-trend .grid > [data-posted-at]')
    ).filter(c => c.style.display !== 'none');

    const startIdx = allCards.indexOf(triggerCard);
    const idx = startIdx < 0 ? 0 : startIdx;

    // 清掃と準備
    snapContainer.innerHTML = '';
    allCards.forEach((card, i) => {
        snapContainer.appendChild(_buildDetailSlide(card, i, allCards.length));
    });

    shell.classList.remove('hidden');
    shell.style.opacity = '0';
    document.body.style.overflow = 'hidden';

    // 対象スライドへ即ジャンプ
    snapContainer.scrollTop = idx * snapContainer.clientHeight;

    forceReflow(shell);
    shell.style.transition = 'opacity 0.22s ease';
    shell.style.opacity = '1';
    shell.classList.add('active');

    allCards.forEach((card, i) => {
        snapContainer.appendChild(_buildDetailSlide(card, i, allCards.length));
    });

    modal.appendChild(snapContainer);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 対象スライドへ即ジャンプ（スナップ前に scrollTop を設定）
    snapContainer.scrollTop = idx * snapContainer.clientHeight;
    requestAnimationFrame(() => {
        snapContainer.scrollTop = idx * snapContainer.clientHeight;
        void modal.offsetWidth;
        modal.style.opacity = '1';
    });

    // ===== 先頭スライドで下スワイプ → 閉じるジェスチャー =====
    let _dtStartY = 0, _dtActive = false;
    snapContainer.addEventListener('touchstart', e => {
        _dtStartY = e.touches[0].clientY;
        _dtActive = false;
    }, { passive: true });
    snapContainer.addEventListener('touchmove', e => {
        if (snapContainer.scrollTop > 12) return;
        const dy = e.touches[0].clientY - _dtStartY;
        if (dy > 20) _dtActive = true;
        if (_dtActive && dy > 0) {
            modal.style.transition = 'none';
            modal.style.transform  = `translateY(${Math.min(dy * 0.48, 200)}px)`;
        }
    }, { passive: true });
    snapContainer.addEventListener('touchend', e => {
        if (!_dtActive) return;
        const dy = e.changedTouches[0].clientY - _dtStartY;
        if (dy > 100) {
            closeCardDetail();
        } else {
            modal.style.transition = 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)';
            modal.style.transform  = '';
            setTimeout(() => { modal.style.transition = 'opacity 0.22s ease'; }, 340);
        }
        _dtActive = false;
    }, { passive: true });
}

// ===== スライド 1 枚を生成 =====
function _buildDetailSlide(card, idx, total) {
    const img       = card.querySelector('img[data-desc]') || card.querySelector('img');
    const scene     = card.dataset.scene   || '';
    const genre     = card.dataset.genre   || '';
    const context   = card.dataset.context || '';
    const desc      = img?.dataset.desc    || 'コーデの詳細情報がありません';
    const tags      = (img?.dataset.tags || '').split(',').filter(Boolean).map(t => t.trim());
    const isDark    = document.documentElement.classList.contains('dark');
    const bg        = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? 'rgba(255,255,255,0.9)' : '#1e293b';
    const subColor  = isDark ? 'rgba(255,255,255,0.55)' : '#64748b';
    const divider   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const tpoMsg = _TPO_MSGS[scene]
        || `📍 「${scene || 'このシーン'}」の着こなし：温度帯と場所に合わせてコーデのバランスを意識してみてください。`;

    const tagHtml = tags.map(t =>
        `<button onclick="quickDigTag('${t}');closeCardDetail();"
            style="padding:5px 12px;background:rgba(0,96,173,0.1);color:#0060ad;border-radius:9999px;font-size:10px;font-weight:700;border:1px solid rgba(0,96,173,0.2);cursor:pointer;">#${t}</button>`
    ).join('');

    // スライドインジケーター（ドット）
    const dots = Array.from({ length: total }, (_, i) =>
        `<div style="width:${i === idx ? 20 : 6}px;height:3px;border-radius:2px;background:${i === idx ? 'white' : 'rgba(255,255,255,0.4)'};transition:width 0.3s;"></div>`
    ).join('');

    const slide = document.createElement('div');
    slide.className = 'card-detail-slide';
    slide.dataset.slideIdx = idx;
    slide.style.cssText = [
        'height:100dvh',
        'scroll-snap-align:start',
        'overflow-y:auto',
        'overscroll-behavior:contain',
        '-webkit-overflow-scrolling:touch',
        `background:${bg}`,
    ].join(';');

    slide.innerHTML = `
        <!-- ヒーロー画像 -->
        <div style="position:relative;height:55dvh;flex-shrink:0;">
            <img src="${img?.src || ''}" alt="コーデ詳細"
                 style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;" />
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%,rgba(0,0,0,0.28) 100%);pointer-events:none;"></div>

            <!-- 閉じるボタン -->
            <button onclick="closeCardDetail()"
                style="position:absolute;top:16px;right:16px;width:40px;height:40px;background:rgba(0,0,0,0.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-radius:50%;border:none;color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:20;box-shadow:0 2px 8px rgba(0,0,0,0.35);">
                <span class="material-symbols-outlined" style="font-size:20px;line-height:1;">close</span>
            </button>

            <!-- スライドインジケーター（ドット列） -->
            <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;align-items:center;">
                ${dots}
            </div>

            ${context ? `<span class="context-badge" style="position:absolute;top:16px;left:16px;">#${context}</span>` : ''}

            <div style="position:absolute;bottom:16px;left:16px;right:60px;display:flex;gap:6px;flex-wrap:wrap;">
                ${scene ? `<span style="padding:3px 10px;background:rgba(255,255,255,0.22);backdrop-filter:blur(4px);color:white;font-size:9px;font-weight:700;border-radius:9999px;">${scene}</span>` : ''}
                ${genre ? `<span style="padding:3px 10px;background:rgba(0,96,173,0.7);backdrop-filter:blur(4px);color:white;font-size:9px;font-weight:700;border-radius:9999px;">${genre}</span>` : ''}
            </div>
        </div>

        <!-- コンテンツパネル -->
        <div style="padding:16px 20px 120px;background:${bg};">

            <!-- 説明文 -->
            <p style="font-size:14px;font-weight:700;line-height:1.65;color:${textColor};">${desc}</p>

            ${tagHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;">${tagHtml}</div>` : ''}

            <!-- TPO コンシェルジュ -->
            <div style="background:${isDark ? 'rgba(59,130,246,0.1)' : 'rgba(0,96,173,0.05)'};border-radius:20px;padding:14px 16px;border:1px solid ${isDark ? 'rgba(59,130,246,0.25)' : 'rgba(0,96,173,0.18)'};margin-top:16px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                    <span class="material-symbols-outlined" style="color:#0060ad;font-size:14px;">workspace_premium</span>
                    <span style="font-size:9px;font-weight:800;color:#0060ad;letter-spacing:0.08em;">TPO コンシェルジュ</span>
                </div>
                <p style="font-size:12px;font-weight:700;line-height:1.6;color:${subColor};margin:0;">${tpoMsg}</p>
            </div>

            ${scene ? `
            <button onclick="filterState.scene='${scene}';filterTrendCards();renderActiveFilterTags();closeCardDetail();"
                style="width:100%;padding:14px;border-radius:16px;background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};border:none;font-size:11px;font-weight:700;color:#0060ad;cursor:pointer;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:6px;">
                <span class="material-symbols-outlined" style="font-size:14px;">search</span>「${scene}」のコーデをもっと見る
            </button>` : ''}
        </div>`;

    return slide;
}

function closeCardDetail() {
    const shell = document.getElementById('tiktok-detail-shell');
    if (!shell) return;
    shell.style.opacity = '0';
    shell.style.transform = 'scale(0.96)';
    setTimeout(() => {
        shell.classList.add('hidden');
        shell.classList.remove('active');
        shell.style.transform = '';
        document.body.style.overflow = '';
    }, 230);
}

// ハッシュタグタップ → ジャンルフィルターとして適用
function quickDigTag(tag) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    filterState.genre = tag;
    _syncGenrePills(tag);
    filterTrendCards();
    renderActiveFilterTags();
    document.getElementById('filter-dot')?.classList.remove('hidden');
}

// ===== 投稿モーダル：背景シーン選択 =====
let selectedPostBg = { key: 'none', label: 'なし' };

function selectPostBg(btn, bgKey, bgLabel) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    selectedPostBg = { key: bgKey, label: bgLabel };

    document.querySelectorAll('.post-bg-btn').forEach(b => {
        const inner = b.querySelector('div');
        if (!inner) return;
        inner.classList.remove('border-primary', 'shadow-md');
        inner.classList.add('border-transparent');
        b.querySelector('span')?.classList.remove('text-primary', 'dark:text-blue-300');
        b.querySelector('span')?.classList.add('text-on-surface-variant', 'dark:text-white/50');
    });
    const inner = btn.querySelector('div');
    if (inner) {
        inner.classList.add('border-primary', 'shadow-md');
        inner.classList.remove('border-transparent');
    }

    // 背景ラベルオーバーレイを更新
    const labelEl = document.getElementById('post-bg-overlay-label');
    if (!labelEl) return;
    if (bgKey !== 'none') {
        labelEl.textContent = `📍 ${bgLabel}`;
        labelEl.classList.remove('hidden');
    } else {
        labelEl.classList.add('hidden');
    }
}

// ===== 検索バー：リアルタイムフィルタリング =====
function initCommunitySearch() {
    const input = document.getElementById('community-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        // QAカード
        document.querySelectorAll('#discover-qa > div').forEach(card => {
            card.style.display = (!q || card.textContent.toLowerCase().includes(q)) ? '' : 'none';
        });
        // TRENDカード
        const trendGrid = document.querySelector('#discover-trend .grid');
        if (!trendGrid) return;
        const addCard = trendGrid.lastElementChild;
        Array.from(trendGrid.children)
            .filter(el => el !== addCard && (el.dataset.postedAt !== undefined || el.dataset.postId !== undefined))
            .forEach(card => {
                const img = card.querySelector('img');
                const text = (card.textContent + ' ' + (img?.dataset.tags || '') + ' ' + (img?.dataset.desc || '')).toLowerCase();
                card.style.display = (!q || text.includes(q)) ? '' : 'none';
            });
    });
}

document.addEventListener('DOMContentLoaded', initCommunitySearch);

// ===== 初期化エントリポイント =====
function initCommunity() {
    // メインタブ UI の初期化
    bindAndroidTouchFixes();
    switchCommunityTab('discover');

    // 投稿一覧レンダリングは AppController に移行
    renderActiveFilterTags();
    // 検索バーをセットアップ
    initCommunitySearch();
    // 設定UIを同期
    _syncSettingsUI();

    // トレンドビューの内部コンポーネントを初期化
    if (typeof AppController !== 'undefined' && typeof AppController.init === 'function') {
        AppController.init();
    }
}

// ===== 公開インターフェース =====
window.KionCommunity = {
    init: initCommunity,
    openPostModal,
    closePostModal,
    switchCommunityTab,
    toggleFilterSheet,
    applyFilters,
    copyToCloset,
    sortTrendPosts,
    quickDigTag,
    submitPost,
};
