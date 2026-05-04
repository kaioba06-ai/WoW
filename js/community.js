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
// reaction: リアクション種別フィルター（オシャレ、かわいい等）
// genre:    ジャンル別フィルター（ストリート、カジュアル等）
const filterState = { scene: 'すべて', temp: '15mid', purpose: null, reaction: null, genre: null };

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
        || filterState.reaction !== null
        || filterState.purpose !== null;
    document.getElementById('filter-dot').classList.toggle('hidden', !hasFilter);
    filterTrendCards();
    renderActiveFilterTags();
    toggleFilterSheet();
}

// ===== トレンドカードのフィルタリング =====
// scene × genre を AND 検索し、reaction が選択されていればそのリアクション数順にソート
function filterTrendCards() {
    const trendGrid = document.querySelector('#discover-trend .grid');
    if (!trendGrid) return;
    const addCard = Array.from(trendGrid.children).find(el => el.classList.contains('add-post-card')) || trendGrid.lastElementChild;
    const posts = Array.from(trendGrid.children).filter(el => el !== addCard && el.dataset.reactions !== undefined);

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

    // リアクション別ソート（reaction フィルター適用時）
    if (filterState.reaction) {
        sortTrendByReaction(filterState.reaction);
    } else {
        sortTrendPosts();
    }
}

// 指定リアクションのカウントが多い順にカードをソート
// toggleReaction の dataset.reacted も参照してユーザーがリアクション済みのカードを優先表示
function sortTrendByReaction(reactionLabel) {
    const trendGrid = document.querySelector('#discover-trend .grid');
    if (!trendGrid) return;
    const addCard = Array.from(trendGrid.children).find(el => el.classList.contains('add-post-card')) || trendGrid.lastElementChild;
    const posts = Array.from(trendGrid.children).filter(
        el => el !== addCard && el.dataset.reactions !== undefined && el.style.display !== 'none'
    );

    const getReactionScore = (card) => {
        const btns = card.querySelectorAll('.reaction-btn, button[onclick*="toggleReaction"], button[onclick*="handleTrendReaction"]');
        for (const btn of btns) {
            const txt = btn.innerText.trim();
            if (!txt.includes(reactionLabel)) continue;
            const m = txt.match(/(\d+(?:\.\d+)?k?)$/);
            if (!m) continue;
            const v = m[1];
            const count = v.endsWith('k') ? parseFloat(v) * 1000 : parseInt(v);
            // ユーザー自身がリアクション済みなら +0.5 ボーナス（同数の場合に優先表示）
            const reactedBonus = btn.dataset.reacted === '1' ? 0.5 : 0;
            return count + reactedBonus;
        }
        return 0;
    };

    posts.sort((a, b) => getReactionScore(b) - getReactionScore(a));
    posts.forEach(p => trendGrid.insertBefore(p, addCard));
}

// ===== アクティブフィルタータグの描画（discover.html 上部に表示） =====
function renderActiveFilterTags() {
    const container = document.getElementById('active-filter-tags');
    if (!container) return;

    const tags = [];
    if (filterState.scene && filterState.scene !== 'すべて') tags.push({ key: 'scene',    label: `🗺️ ${filterState.scene}` });
    if (filterState.genre)                                   tags.push({ key: 'genre',    label: `🎨 ${filterState.genre}` });
    if (filterState.reaction)                                tags.push({ key: 'reaction', label: `✨ ${filterState.reaction}` });
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
        || filterState.reaction !== null
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

    // 演出をキックするロジック（Vibeに準じたAntiGravity）
    // vibeの名前に応じてリアクションをマッピング
    let reactionType = 'エモい'; 
    if (vibe === 'Tokyo Night') reactionType = 'クール';
    else if (vibe === 'Cafe Casual') reactionType = 'かわいい';
    
    // AntiGravityをトリガー
    triggerAntiGravity(reactionType);
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
    card.dataset.reactions = 0;
    card.dataset.postedAt  = dynId;
    card.dataset.scene     = selectedPostBg.label !== 'なし' ? selectedPostBg.label : '';
    card.dataset.genre     = '';
    card.className = 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[20px] overflow-hidden border border-white/50 dark:border-white/10 shadow-sm relative group flex flex-col animate-[fadeSlideIn_0.4s_ease_forwards]';
    card.innerHTML = `
        ${imgSrc ? `<div class="relative cursor-pointer"><img class="w-full h-36 object-cover" src="${imgSrc}"/><div class="absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded text-[8px] font-extrabold shadow-md">NEW ✨</div><button onclick="copyToCloset(this,'${imgSrc.replace(/'/g,"\\'")}','${text.replace(/'/g,"\\'").slice(0,20) || 'シェアコーデ'}')" class="save-closet-btn absolute top-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-primary dark:text-blue-400 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border border-white/50"><span class="material-symbols-outlined text-[16px]">hanger</span></button></div>` : ''}
        <div class="px-3 py-2 text-[10px] font-bold dark:text-white/80 text-on-surface-variant leading-snug">${text.replace(/</g,'&lt;')}</div>
        <div class="px-2.5 pt-2 pb-1 space-y-1.5 mt-auto">
            <div id="react-display-dyn-${dynId}" class="flex gap-1 flex-wrap min-h-[20px]"></div>
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black text-on-surface-variant dark:text-white/40 tracking-wider">0 CURATIONS</span>
                <button class="reaction-plus-btn w-8 h-8 bg-primary dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-lg shadow-md active:scale-90 transition-transform"
                    data-display-id="react-display-dyn-${dynId}" data-card-idx="-1">👍</button>
            </div>
        </div>`;
    trendGrid.insertBefore(card, addCard);
}

function handleTrendReaction(btn, emoji, label) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    const match = btn.innerText.match(/\d+$/);
    let count = match ? parseInt(match[0]) : 0;
    count++;
    btn.innerHTML = `${emoji} ${label} ${count}`;

    const card = btn.closest('.flex-col');
    if(card) {
        let total = parseInt(card.dataset.reactions || 0);
        total++;
        card.dataset.reactions = total;
        sortTrendPosts();
    }
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
    const posts = Array.from(trendGrid.children).filter(el => el !== addCard && el.dataset.reactions !== undefined);

    const firstPositions = new Map();
    posts.forEach(p => firstPositions.set(p, p.getBoundingClientRect()));

    if (currentSortMode === 'niche') {
        posts.sort((a, b) => parseInt(a.dataset.reactions || 0) - parseInt(b.dataset.reactions || 0));
    } else {
        posts.sort((a, b) => parseInt(b.dataset.reactions || 0) - parseInt(a.dataset.reactions || 0));
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

// ===== トレンド: リアクショントグル =====
function toggleReaction(btn, baseCount) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    const reacted = btn.dataset.reacted === '1';
    btn.dataset.reacted = reacted ? '0' : '1';

    const count = reacted ? baseCount : baseCount + 1;
    const parts = btn.innerText.trim().split(' ');
    const emoji = parts[0];
    const label = parts.slice(1, -1).join(' ');
    const displayCount = count >= 1000 ? (count/1000).toFixed(1) + 'k' : count;
    btn.innerHTML = `${emoji} ${label} ${displayCount}`;

    btn.style.transform = reacted ? '' : 'scale(1.05)';
    setTimeout(() => { btn.style.transform = ''; }, 200);

    const card = btn.closest('.flex-col');
    if(card) {
        let total = 0;
        card.querySelectorAll('.reaction-btn, button[onclick*="Reaction"]').forEach(b => {
             const txt = b.innerText.trim();
             const m = txt.match(/(\d+(\.\d+)?[k]?)$/);
             if(m) {
                 let valStr = m[1];
                 total += valStr.endsWith('k') ? parseFloat(valStr) * 1000 : parseInt(valStr);
             }
        });
        card.dataset.reactions = total;
        sortTrendPosts();
    }
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
    Array.from(grid.children).filter(el => el !== addCard && el.dataset.reactions !== undefined).forEach(card => {
        card.style.display = (!context || card.dataset.context === context) ? '' : 'none';
    });
}

// ===== リアクションテーマのマスターデータ =====
const REACTION_THEME_MASTER = {
    dig: {
        id: 'dig', label: 'ディグる', emoji: '🕳️', icon: '⛏️', color: '#1A1A2E', rgb: '26,26,46', bg: 'rgba(26,26,46,0.18)', effects: ['💎','🔷','🌟']
    },
    emoi: {
        id: 'emoi', label: 'エモい', emoji: '🌙', icon: '🌇', color: '#FF7F50', rgb: '255,127,80', bg: 'rgba(255,127,80,0.18)', effects: ['🌆','📸','✨']
    },
    cool: {
        id: 'cool', label: 'かっこいい', emoji: '😎', icon: '⚡', color: '#4A90E2', rgb: '74,144,226', bg: 'rgba(74,144,226,0.18)', effects: ['🔥','⚡','😎']
    },
    dress: {
        id: 'dress', label: 'これ着る', emoji: '👕', icon: '👗', color: '#FF4757', rgb: '255,71,87', bg: 'rgba(255,71,87,0.18)', effects: ['👗','🛍️','✨']
    },
    useful: {
        id: 'useful', label: '役に立つ', emoji: '💡', icon: '✅', color: '#2ECC71', rgb: '46,204,113', bg: 'rgba(46,204,113,0.18)', effects: ['💡','✅','📝']
    },
    sense: {
        id: 'sense', label: 'センス', emoji: '🎨', icon: '👑', color: '#F1C40F', rgb: '241,196,15', bg: 'rgba(241,196,15,0.18)', effects: ['🎨','👑','🌟']
    },
    cute: {
        id: 'cute', label: 'かわいい', emoji: '💖', icon: '🎀', color: '#FF80AB', rgb: '255,128,171', bg: 'rgba(255,128,171,0.18)', effects: ['💖','🎀','🌸']
    },
};

const NEW_REACTIONS = Object.values(REACTION_THEME_MASTER);

// 扇形オフセット (px) — 6ボタンを弧状に配置
const FAN_OFFSETS = [
    { x: -88, y: -24 },
    { x: -60, y: -68 },
    { x: -18, y: -86 },
    { x:  26, y: -86 },
    { x:  58, y: -68 },
    { x:  80, y: -24 },
];

let _activePopupDisplayId = null;
let _activePopupCardIdx   = null;
let _activePopupEl        = null;

// タップ時のシンプルアーク（ドラッグ系は _initReactionDelegation で処理）
function openReactionPopup(triggerBtn, displayId, cardIdx) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    if (_activePopupEl) { _closeReactionPopup(); return; }

    _activePopupDisplayId = displayId;
    _activePopupCardIdx   = cardIdx;

    const rect = triggerBtn.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.id = 'reaction-popup';
    popup.style.cssText = `position:fixed;left:${rect.left + rect.width/2}px;top:${rect.top}px;z-index:10000;`;

    NEW_REACTIONS.forEach((r, i) => {
        const btn = document.createElement('button');
        btn.className = 'reaction-fan-btn w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white active:scale-90';
        btn.style.cssText = `--fx:${FAN_OFFSETS[i].x}px;--fy:${FAN_OFFSETS[i].y}px;background:${r.bg};animation-delay:${i * 30}ms;`;
        btn.textContent = r.emoji;
        btn.title = r.label;
        btn.dataset.reactionIdx = i;

        const tip = document.createElement('span');
        tip.className = 'reaction-fan-tip';
        tip.textContent = r.label;
        btn.appendChild(tip);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _applyNewReaction(r, displayId, cardIdx);
            _closeReactionPopup();
        });
    });

    document.body.appendChild(popup);
    void popup.offsetWidth; // 描画ライフサイクルを強制しアニメーションを着火
    _activePopupEl = popup;
    setTimeout(() => document.addEventListener('click', _onOutsideClick), 0);
}

function _onOutsideClick() {
    _closeReactionPopup();
}

function _closeReactionPopup() {
    if (!_activePopupEl) return;
    document.removeEventListener('click', _onOutsideClick);
    _activePopupEl.querySelectorAll('.reaction-fan-btn').forEach(b => b.classList.add('closing'));
    setTimeout(() => { _activePopupEl?.remove(); _activePopupEl = null; }, 220);
}

// ===== ドラッグ＆ドロップ・リアクションシステム =====
let _reactionDragState = null;

function _initReactionDelegation() {
    document.addEventListener('pointerdown', _handleRxPointerDown, { passive: false });
}

function _handleRxPointerDown(e) {
    const plusBtn = e.target.closest('.reaction-plus-btn');
    if (!plusBtn || _reactionDragState || _activePopupEl) return;

    e.preventDefault();
    e.stopPropagation();
    plusBtn.setPointerCapture(e.pointerId);

    const displayId = plusBtn.dataset.displayId;
    const cardIdx   = parseInt(plusBtn.dataset.cardIdx || 0);

    _reactionDragState = {
        btn:        plusBtn,
        displayId,
        cardIdx,
        pointerId:  e.pointerId,
        startX:     e.clientX,
        startY:     e.clientY,
        lpFired:    false,
        lpTimer:    null,
        arcEl:      null,
        reaction:   null,    // 選択中の NEW_REACTIONS アイテム
        ghost:      null,    // 指に追従する絵文字 DOM
        targetCard: null,    // ドロップ先カード
    };

    const st = _reactionDragState;

    // 長押しタイマー (450ms)
    st.lpTimer = setTimeout(() => {
        st.lpFired = true;
        if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([20, 10]);
        _openDragArc(st);
    }, 450);

    plusBtn.addEventListener('pointermove',   _handleRxPointerMove,   { passive: false });
    plusBtn.addEventListener('pointerup',     _handleRxPointerUp,     { once: true, passive: false });
    plusBtn.addEventListener('pointercancel', _handleRxPointerCancel, { once: true });
}

function _handleRxPointerMove(e) {
    const st = _reactionDragState;
    if (!st || e.pointerId !== st.pointerId) return;

    // アーク未展開かつ移動量 10px 未満 → 長押しタイマーを妨げない
    if (!st.arcEl) {
        const moved = Math.hypot(e.clientX - st.startX, e.clientY - st.startY);
        if (moved < 10) return;
        // 10px 以上動いたらタイマーをキャンセルし、タップとして処理
        clearTimeout(st.lpTimer);
        st.btn.removeEventListener('pointermove', _handleRxPointerMove);
        _cleanupDragState(false);
        openReactionPopup(st.btn, st.displayId, st.cardIdx);
        return;
    }
    e.preventDefault();

    // ゴーストを指に追従
    if (st.ghost) {
        st.ghost.style.left = `${e.clientX - 20}px`;
        st.ghost.style.top  = `${e.clientY - 70}px`;
    }

    // ゴーストを一時的に非表示にしてhitTestを正確にする
    if (st.ghost) st.ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (st.ghost) st.ghost.style.visibility = '';

    // 扇ボタン上か？→ リアクション選択
    const fanBtn = el?.closest('.reaction-fan-btn');
    if (fanBtn) {
        const idx = parseInt(fanBtn.dataset.reactionIdx);
        if (st.reaction !== NEW_REACTIONS[idx]) {
            st.arcEl.querySelectorAll('.reaction-fan-btn').forEach(b => b.classList.remove('drag-selected'));
            fanBtn.classList.add('drag-selected');
            st.reaction = NEW_REACTIONS[idx];
            if (st.ghost) {
                st.ghost.textContent = st.reaction.emoji;
                st.ghost.style.opacity = '1';
                st.ghost.style.filter  = `drop-shadow(0 0 10px ${st.reaction.color})`;
            }
            if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
        }
        if (st.targetCard) { st.targetCard.classList.remove('drag-over-card'); st.targetCard = null; }
        return;
    }

    // カード上か？→ ドロップ先をハイライト
    if (st.reaction) {
        const card = el?.closest('[data-reactions]');
        if (card !== st.targetCard) {
            if (st.targetCard) st.targetCard.classList.remove('drag-over-card');
            st.targetCard = card || null;
            if (st.targetCard) {
                st.targetCard.classList.add('drag-over-card');
                if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
            }
        }
    }
}

function _handleRxPointerUp(e) {
    const st = _reactionDragState;
    if (!st || e.pointerId !== st.pointerId) return;
    clearTimeout(st.lpTimer);
    st.btn.removeEventListener('pointermove', _handleRxPointerMove);

    if (!st.lpFired) {
        // 短タップ → タップアーク表示
        _cleanupDragState(false);
        openReactionPopup(st.btn, st.displayId, st.cardIdx);
        return;
    }

    // ドラッグ終了 → リアクション確定
    if (st.reaction) {
        let targetDisplayId = st.displayId;
        if (st.targetCard) {
            const disp = st.targetCard.querySelector('[id^="react-display"]');
            if (disp) targetDisplayId = disp.id;
        }
        _applyNewReaction(st.reaction, targetDisplayId, st.cardIdx);
    }
    _cleanupDragState(true);
}

function _handleRxPointerCancel() {
    const st = _reactionDragState;
    if (!st) return;
    clearTimeout(st.lpTimer);
    st.btn.removeEventListener('pointermove', _handleRxPointerMove);
    _cleanupDragState(true);
}

function _openDragArc(st) {
    const rect = st.btn.getBoundingClientRect();
    const arc  = document.createElement('div');
    arc.id = 'reaction-popup';
    // pointer-events:none on container — individual buttons handle their own events via pointermove hit-test
    arc.style.cssText = `position:fixed;left:${rect.left + rect.width/2}px;top:${rect.top}px;z-index:10000;pointer-events:none;`;

    NEW_REACTIONS.forEach((r, i) => {
        const btn = document.createElement('button');
        btn.className = 'reaction-fan-btn w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white';
        btn.style.cssText = `--fx:${FAN_OFFSETS[i].x}px;--fy:${FAN_OFFSETS[i].y}px;background:${r.bg};animation-delay:${i * 30}ms;pointer-events:none;`;
        btn.textContent = r.emoji;
        btn.dataset.reactionIdx = i;

        const tip = document.createElement('span');
        tip.className = 'reaction-fan-tip';
        tip.textContent = r.label;
        btn.appendChild(tip);

        arc.appendChild(btn);
    });

    document.body.appendChild(arc);
    void arc.offsetWidth; // 描画ライフサイクルを強制
    st.arcEl      = arc;
    _activePopupEl = arc; // close-on-outside-tap compatibility

    // ゴースト絵文字（不透明度1で出現）
    const ghost = document.createElement('span');
    ghost.className = 'drag-emoji-ghost';
    ghost.style.cssText = `left:${rect.left}px;top:${rect.top - 70}px;opacity:1;z-index:10001;`;
    document.body.appendChild(ghost);
    st.ghost = ghost;
}

function _cleanupDragState(animated) {
    const st = _reactionDragState;
    _reactionDragState = null;
    if (!st) return;

    if (st.arcEl) {
        if (animated) {
            st.arcEl.querySelectorAll('.reaction-fan-btn').forEach(b => b.classList.add('closing'));
            setTimeout(() => st.arcEl?.remove(), 220);
        } else {
            st.arcEl.remove();
        }
        _activePopupEl = null;
    }
    if (st.ghost)      st.ghost.remove();
    if (st.targetCard) st.targetCard.classList.remove('drag-over-card');
}

// ===== Elastic Pull リアクション =====
// カードを右スワイプ → ゴム伸び → 扇状アーク → スライド選択 → 確定

const PULL_THRESHOLD = 52;   // px: アーク出現閾値
const PULL_MAX       = 115;  // px: 減衰開始距離
const PULL_RESIST    = 0.52; // 減衰係数（ゴム感）

// 左サイドから扇状に広がるオフセット
const PULL_ARC_OFFSETS = [
    { x:  8,  y: -82 },
    { x: 42,  y: -54 },
    { x: 58,  y: -14 },
    { x: 58,  y:  26 },
    { x: 42,  y:  58 },
    { x:  8,  y:  80 },
];

let _pullState      = null;
let _doubleTapTimer = null;  // ダブルタップ判定タイマー
let _doubleTapCard  = null;  // 1回目タップのカード参照

function _initElasticPull() {
    const grid = document.getElementById('curated-feed-grid');
    if (!grid) return;
    // 既にリスナー登録済みなら重複しない
    if (grid._elasticPullInit) return;
    grid._elasticPullInit = true;
    grid.addEventListener('pointerdown', _onPullDown, { passive: false });
}

function _onPullDown(e) {
    if (_pullState) return;
    const card = e.target.closest('[data-reactions]');
    if (!card) return;
    // "+" / QUICK DIG / クローゼットボタン / 既存リアクションバッジは除外
    e.preventDefault();
    e.stopPropagation(); // 二重発火防止
    card.setPointerCapture(e.pointerId);
    window._kionElasticActive = true;  // タブスワイプとの排他制御

    _pullState = {
        card,
        startX:    e.clientX,
        startY:    e.clientY,
        pointerId: e.pointerId,
        pulling:   false,
        elastic:   0,
        reaction:  null,
        arcEl:     null,
        clickBlocked: false,  // スワイプ時にカードのclick発火を抑制
    };

    card.addEventListener('pointermove',   _onPullMove);
    card.addEventListener('pointerup',     _onPullUp,     { once: true });
    card.addEventListener('pointercancel', _onPullCancel, { once: true });
}

function _onPullMove(e) {
    const st = _pullState;
    if (!st || e.pointerId !== st.pointerId) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    // 縦スクロール優先: 縦移動が大きければキャンセル
    if (!st.pulling && Math.abs(dy) > Math.abs(dx) + 8) {
        _pullRelease(st, false); return;
    }
    // 右方向のみ
    if (dx <= 0) { if (st.pulling) _pullRelease(st, true); return; }
    if (dx < 15) return;  // 0〜15px は判定保留（誤操作防止）

    if (!st.pulling) {
        st.pulling = true;
        st.card.style.transition  = 'none';
        st.card.style.willChange  = 'transform';
        st.card.style.touchAction = 'none';

        // スワイプモード突入：以降の click イベントを capture で消費してカード詳細を阻止
        if (!st.clickBlocked) {
            st.clickBlocked = true;
            st.card.addEventListener('click', _blockPullClick, { capture: true });
        }
    }

    // ゴム感：PULL_MAX を超えると急減衰
    const elastic = dx < PULL_MAX
        ? dx * PULL_RESIST
        : PULL_MAX * PULL_RESIST + (dx - PULL_MAX) * 0.08;
    st.elastic = elastic;

    st.card.style.transform = `translateX(${elastic}px)`;

    // 引っ張り強度に応じた微細バイブ
    if (kionSettings.isHapticEnabled && navigator.vibrate && (dx | 0) % 18 === 0) {
        navigator.vibrate([2]);
    }

    // 閾値到達でアーク展開
    if (dx >= PULL_THRESHOLD && !st.arcEl) {
        _showPullArc(st);
        if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([12, 6, 8]);
    }

    // アーク上のホバーチェック
    if (st.arcEl) {
        // ゴーストがhitTestを邪魔しないよう一時退避
        st.arcEl.style.pointerEvents = 'none';
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        st.arcEl.style.pointerEvents = '';

        const fanBtn = hit?.closest('.pull-fan-btn');
        if (fanBtn) {
            const r = NEW_REACTIONS[parseInt(fanBtn.dataset.reactionIdx)];
            if (st.reaction !== r) {
                st.arcEl.querySelectorAll('.pull-fan-btn').forEach(b => b.classList.remove('drag-selected'));
                fanBtn.classList.add('drag-selected');
                st.reaction = r;
                if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
            }
        } else {
            if (st.reaction) {
                st.arcEl.querySelectorAll('.pull-fan-btn').forEach(b => b.classList.remove('drag-selected'));
                st.reaction = null;
            }
        }
    }
}

function _onPullUp(e) {
    const st = _pullState;
    if (!st || e.pointerId !== st.pointerId) return;
    st.card.removeEventListener('pointermove', _onPullMove);
    _pullState = null;

    if (!st.pulling) {
        const card = st.card;

        if (_doubleTapCard === card && _doubleTapTimer) {
            // ===== ダブルタップ確定 → 💖かわいい =====
            clearTimeout(_doubleTapTimer);
            _doubleTapTimer = null;
            _doubleTapCard  = null;
            if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([15, 5, 25]);
            const kawaii = NEW_REACTIONS[0]; // 💖かわいい
            const disp = card.querySelector('[id^="react-display"]');
            if (disp) _applyNewReaction(kawaii, disp.id, null);
            _triggerLoveRipple(e.clientX, e.clientY);
            _triggerSimpleCelebration(kawaii, card);
        } else {
            // ===== シングルタップ → 260ms 待機してダブルタップと区別 =====
            if (_doubleTapTimer) { clearTimeout(_doubleTapTimer); _doubleTapTimer = null; }
            _doubleTapCard = card;
            _doubleTapTimer = setTimeout(() => {
                _doubleTapTimer = null;
                _doubleTapCard  = null;
                const wrapper = card.querySelector('.relative');
                if (wrapper) openCardDetail(wrapper);
            }, 260);
        }
        return;
    }

    if (st.reaction) {
        // カチッとした確定バイブ
        if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10, 5, 20]);
        const disp = st.card.querySelector('[id^="react-display"]');
        if (disp) _applyNewReaction(st.reaction, disp.id, null);
        _triggerSimpleCelebration(st.reaction, st.card);
    }

    _pullRelease(st, true);
}

function _onPullCancel() {
    const st = _pullState;
    if (!st) return;
    st.card.removeEventListener('pointermove', _onPullMove);
    _pullState = null;
    // ダブルタップ待機中ならキャンセル
    if (_doubleTapTimer) { clearTimeout(_doubleTapTimer); _doubleTapTimer = null; _doubleTapCard = null; }
    _pullRelease(st, true);
}

function _showPullArc(st) {
    const rect = st.card.getBoundingClientRect();
    const arc  = document.createElement('div');
    arc.className = 'pull-arc-container';
    arc.style.cssText = [
        `position:fixed`,
        `left:${rect.left + 14}px`,
        `top:${rect.top + rect.height / 2}px`,
        `z-index:9990`,
        `pointer-events:none`,
    ].join(';');

    NEW_REACTIONS.forEach((r, i) => {
        const btn = document.createElement('button');
        btn.className = 'pull-fan-btn reaction-fan-btn w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white';
        btn.style.cssText = [
            `--fx:${PULL_ARC_OFFSETS[i].x}px`,
            `--fy:${PULL_ARC_OFFSETS[i].y}px`,
            `background:${r.bg}`,
            `animation-delay:${i * 22}ms`,
            `pointer-events:none`,
        ].join(';');
        btn.textContent  = r.emoji;
        btn.dataset.reactionIdx = i;

        const tip = document.createElement('span');
        tip.className   = 'reaction-fan-tip';
        tip.textContent = r.label;
        btn.appendChild(tip);

        arc.appendChild(btn);
    });

    document.body.appendChild(arc);
    st.arcEl = arc;
}

// スワイプ中に発生する click を consume して詳細展開を阻止（1回のみ）
function _blockPullClick(e) {
    e.stopPropagation();
    e.preventDefault();
    // 自分自身を解除
    e.currentTarget.removeEventListener('click', _blockPullClick, { capture: true });
}

function _pullRelease(st, animated) {
    window._kionElasticActive = false;  // タブスワイプ排他を解除
    if (st.arcEl) { st.arcEl.remove(); st.arcEl = null; }
    const card = st.card;
    card.removeEventListener('pointermove', _onPullMove);
    // 念のため click ブロッカーも解除（スワイプせず終わった場合）
    card.removeEventListener('click', _blockPullClick, { capture: true });

    if (animated && st.elastic > 0) {
        card.style.transition = 'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    card.style.transform  = '';
    card.style.willChange = '';
    card.style.touchAction = '';
    setTimeout(() => { card.style.transition = ''; }, 400);
}

// ===== 方法④: 既存バッジへの便乗タップ（Toggle） =====
function _initBadgeTap() {
    document.addEventListener('click', (e) => {
        const badge = e.target.closest('.reacted-badge');
        if (!badge) return;
        e.stopPropagation(); // バブリング防止：詳細は開かない
        _toggleBadgeReaction(badge);
    });
}

function _toggleBadgeReaction(badge) {
    const text     = badge.textContent.trim();
    const reaction = NEW_REACTIONS.find(r => text.startsWith(r.emoji));
    if (!reaction) return;

    const card    = badge.closest('[data-reactions]');
    const display = badge.closest('[id^="react-display"]');
    const already = badge.dataset.userReacted === '1';

    if (already) {
        // 取り消し（トグルOFF）
        badge.dataset.userReacted = '0';
        badge.classList.remove('user-reacted');
        const m = text.match(/(\d+)$/);
        const n = m ? parseInt(m[1]) - 1 : 0;
        if (n <= 0) {
            badge.remove();
        } else {
            badge.textContent = `${reaction.emoji} ${reaction.label} ${n}`;
        }
        if (card) {
            card.dataset.reactions = Math.max(0, parseInt(card.dataset.reactions || 0) - 1);
        }
    } else {
        // 便乗リアクション（トグルON）
        badge.dataset.userReacted = '1';
        badge.classList.add('user-reacted');
        const m = text.match(/(\d+)$/);
        const n = m ? parseInt(m[1]) + 1 : 1;
        badge.textContent = `${reaction.emoji} ${reaction.label} ${n}`;
        if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10, 5, 20]);
        if (card) {
            card.dataset.reactions = parseInt(card.dataset.reactions || 0) + 1;
        }
        // カラーフラッシュ＋巨大絵文字演出
        _triggerSimpleCelebration(reaction, card);
        if (display) {
            forceReflow(display);
            _triggerCelebration(reaction, display);
        }
    }

    sortTrendPosts();
}

// ===== シンプル演出：1秒カラーオーバーレイ + 中央絵文字 =====
function _triggerSimpleCelebration(reaction, anchorCard) {
    if (kionSettings.isFullScreenEffectEnabled) {
        // 全画面モード
        const overlay = document.createElement('div');
        overlay.className = 'simple-celebration-overlay';
        overlay.style.background = reaction.color;
        const emoji = document.createElement('span');
        emoji.className = 'simple-celebration-emoji';
        emoji.textContent = reaction.emoji;
        overlay.appendChild(emoji);
        document.body.appendChild(overlay);

        // offsetWidth で初期状態を確定させてからトランジション起動
        void overlay.offsetWidth;
        requestAnimationFrame(() => {
            overlay.style.opacity = '0.32';
            emoji.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        setTimeout(() => {
            overlay.style.transition = 'opacity 0.45s ease';
            overlay.style.opacity    = '0';
            setTimeout(() => overlay.remove(), 460);
        }, 1000);

    } else {
        // カードのみモード
        if (!anchorCard) return;
        const flash = document.createElement('div');
        flash.className = 'card-celebration-flash';
        flash.style.background = reaction.color;
        const emoji = document.createElement('span');
        emoji.className = 'card-celebration-emoji';
        emoji.textContent = reaction.emoji;
        flash.appendChild(emoji);

        // カードが position:relative を持つよう保証
        const prevPos = anchorCard.style.position;
        if (!prevPos) anchorCard.style.position = 'relative';
        anchorCard.appendChild(flash);

        void flash.offsetWidth;
        requestAnimationFrame(() => {
            flash.style.opacity = '0.38';
            emoji.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        setTimeout(() => {
            flash.style.transition = 'opacity 0.4s ease';
            flash.style.opacity    = '0';
            setTimeout(() => {
                flash.remove();
                if (!prevPos) anchorCard.style.position = '';
            }, 410);
        }, 1000);
    }
}

function _applyNewReaction(reactionOrType, displayId, _cardIdx) {
    ReactionModule.trigger(reactionOrType, displayId, _cardIdx);

    // 旧ロジックは ReactionModule.trigger に集約されました。
    // 旧ロジックは ReactionModule.trigger に集約されました。
}

// ===== 自己完結型セレブレーションシステム (ultimate_demo_v2 準拠) =====
// DOM要素が存在しない場合に自動生成するBootstrap機構を搭載

let _radTarget = 0;   
let _radCurrent = 0;  
let _radActive = false;
let _currentColor = { hex: '#4A90E2', rgb: '74, 144, 226' };
let _fadeOutTimer;
let _particles = [];
const _tagList = ['#Discovery', '#Vibe', '#Dig', '#Trend', '#Mood', '#Amazing', '#Style', '#OOTD', '#センス', '#着回し'];
const _celebrationEmojis = ['⚡', '❤️', '⛏️', '✨', '📌', '🔥', '🎉', '💫', '🌟', '✦'];

// HEX→RGB変換ユーティリティ
function _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '74, 144, 226';
}

// DOM自動生成 — 必要なレイヤーが無ければ即座にInjectする
function _ensureCelebrationDOM() {
    // Style injection (一度だけ)
    if (!document.getElementById('kion-celebration-styles')) {
        const style = document.createElement('style');
        style.id = 'kion-celebration-styles';
        style.textContent = `
            #kion-dimOverlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.92);
                z-index: 9900; opacity: 0; pointer-events: none;
                transition: opacity 0.3s ease;
            }
            #kion-radialLayer {
                position: fixed; inset: 0; z-index: 9905;
                pointer-events: none; opacity: 0;
            }
            #kion-hashtagContainer {
                position: fixed; inset: 0; pointer-events: none; z-index: 9910;
            }
            #kion-giantEmoji {
                position: fixed; left: 50%; top: 50%;
                transform: translate(-50%, -50%) scale(0);
                font-size: 220px; z-index: 9999;
                pointer-events: none; opacity: 0;
                will-change: transform, opacity;
            }
            @keyframes kion-giant-extreme-shake {
                0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                10%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                15%  { transform: translate(calc(-50% - 30px), calc(-50% + 25px)) scale(1.05) rotate(8deg); }
                20%  { transform: translate(calc(-50% + 25px), calc(-50% - 30px)) scale(0.95) rotate(-7deg); }
                25%  { transform: translate(calc(-50% - 25px), calc(-50% - 20px)) scale(1.1) rotate(6deg); }
                30%  { transform: translate(calc(-50% + 30px), calc(-50% + 30px)) scale(0.92) rotate(-8deg); }
                35%  { transform: translate(calc(-50% - 20px), calc(-50% + 15px)) scale(1.03) rotate(5deg); }
                40%  { transform: translate(calc(-50% + 15px), calc(-50% - 25px)) scale(0.97) rotate(-4deg); }
                45%  { transform: translate(calc(-50% - 10px), calc(-50% - 15px)) scale(1.0) rotate(2deg); }
                50%  { transform: translate(-50%, -50%) scale(1.0) rotate(0deg); opacity: 1; }
                80%  { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; filter: blur(25px); }
            }
            .kion-hashtag-burst {
                position: absolute; color: white; font-weight: 900; font-size: 16px;
                letter-spacing: 1.5px; padding: 8px 18px; border-radius: 24px;
                background: rgba(26, 26, 46, 0.6); backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.3);
                text-shadow: 0 2px 10px rgba(0,0,0,0.9);
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                opacity: 0; will-change: transform, opacity;
            }
            .kion-particle { position: fixed; pointer-events: none; z-index: 9908; will-change: transform; }
        `;
        document.head.appendChild(style);
    }

    // DOM layer injection
    if (!document.getElementById('kion-dimOverlay')) {
        const dim = document.createElement('div');
        dim.id = 'kion-dimOverlay';
        document.body.appendChild(dim);
    }
    if (!document.getElementById('kion-radialLayer')) {
        const rad = document.createElement('div');
        rad.id = 'kion-radialLayer';
        document.body.appendChild(rad);
    }
    if (!document.getElementById('kion-hashtagContainer')) {
        const ht = document.createElement('div');
        ht.id = 'kion-hashtagContainer';
        document.body.appendChild(ht);
    }
    if (!document.getElementById('kion-giantEmoji')) {
        const ge = document.createElement('div');
        ge.id = 'kion-giantEmoji';
        document.body.appendChild(ge);
    }
}

function _animateRadial() {
    if (!_radActive) return;
    const radialLayer = document.getElementById('kion-radialLayer');
    if (!radialLayer) return;

    _radCurrent += (_radTarget - _radCurrent) * 0.15;

    radialLayer.style.background = `radial-gradient(circle at 50% 50%,
        ${_currentColor.hex} 0%,
        ${_currentColor.hex} ${_radCurrent}%,
        #000000 ${_radCurrent + 0.1}%,
        #000000 ${_radCurrent + 10}%,
        rgba(${_currentColor.rgb}, 0.6) ${_radCurrent + 15}%,
        rgba(${_currentColor.rgb}, 0) ${_radCurrent + 80}%
    )`;
    requestAnimationFrame(_animateRadial);
}

// ===== メインエントリ：_triggerCelebration =====
// reaction: { emoji: '⛏️', color: '#D4AF37' }
// anchorEl: 対象のDOM要素（カード）
function _triggerCelebration(reaction, anchorEl) {
    // カードのみモードの場合は全画面演出をスキップ
    if (!kionSettings.isFullScreenEffectEnabled) {
        // カードローカルのミニフラッシュのみ
        _triggerSimpleCelebration(reaction, anchorEl);
        return;
    }

    _ensureCelebrationDOM();

    // テーマカラーを解析・適用
    const colorHex = reaction.color || '#4A90E2';
    _currentColor = { hex: colorHex, rgb: _hexToRgb(colorHex) };

    if (navigator.vibrate) navigator.vibrate([100, 150, 250]);

    const radialLayer = document.getElementById('kion-radialLayer');
    const giantEmoji  = document.getElementById('kion-giantEmoji');
    const dimOverlay  = document.getElementById('kion-dimOverlay');

    // 1. 暗転オーバーレイ
    if (dimOverlay) {
        dimOverlay.style.opacity = '1';
        setTimeout(() => { if (dimOverlay) dimOverlay.style.opacity = '0'; }, 2500);
    }

    // 2. 同心円 Radial Gradient
    clearTimeout(_fadeOutTimer);
    _radCurrent = 0;
    _radTarget = 150;
    if (radialLayer) {
        radialLayer.style.transition = 'none';
        radialLayer.style.opacity = '1';
    }
    if (!_radActive) {
        _radActive = true;
        requestAnimationFrame(_animateRadial);
    }

    // 3. ハッシュタグ爆発
    _spawnHashtagsBurst();

    // 4. 巨大絵文字（シェイクバースト）
    if (giantEmoji) {
        giantEmoji.textContent = reaction.emoji;
        giantEmoji.style.animation = 'none';
        giantEmoji.style.filter = `drop-shadow(0 0 80px ${colorHex})`;
        void giantEmoji.offsetWidth; // Force reflow
        giantEmoji.style.animation = 'kion-giant-extreme-shake 1.6s ease-out forwards';
    }

    // 5. シネマティックFountain演出 (FountainComponent) / フォールバック
    if (typeof window.FountainComponent !== 'undefined') {
        window.FountainComponent.fire(reaction, anchorEl);
    } else {
        _startParticleRain();
    }

    // 6. フェードアウト
    _fadeOutTimer = setTimeout(() => {
        if (radialLayer) {
            radialLayer.style.transition = 'opacity 3s ease-out';
            radialLayer.style.opacity = '0';
        }
        setTimeout(() => { _radActive = false; }, 3000);
    }, 1000);
}

// グローバル公開
window._triggerCelebration = _triggerCelebration;

function _spawnHashtagsBurst() {
    const container = document.getElementById('kion-hashtagContainer');
    if (!container) return;
    container.innerHTML = '';
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const tagCount = 15 + Math.floor(Math.random() * 6);

    for (let i = 0; i < tagCount; i++) {
        const span = document.createElement('span');
        span.className = 'kion-hashtag-burst';
        span.style.color = _currentColor.hex;
        span.style.borderColor = `rgba(${_currentColor.rgb}, 0.5)`;
        span.textContent = _tagList[Math.floor(Math.random() * _tagList.length)];
        span.style.left = cx + 'px';
        span.style.top = cy + 'px';
        container.appendChild(span);

        const directionMultiplier = Math.random() > 0.5 ? 1 : -1;
        const vx = directionMultiplier * (200 + Math.random() * 400);
        const vyPeak = -300 - Math.random() * 400;
        const dur = 2000 + Math.random() * 1000;

        if (span.animate) {
            span.animate([
                { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0, offset: 0 },
                { transform: `translate(calc(-50% + ${vx * 0.5}px), calc(-50% + ${vyPeak}px)) scale(1.1)`, opacity: 1, offset: 0.3 },
                { transform: `translate(calc(-50% + ${vx * 0.9}px), calc(-50% + ${vyPeak + 100}px)) scale(1.4)`, opacity: 1, offset: 0.7 },
                { transform: `translate(calc(-50% + ${vx}px), calc(-50% + ${vyPeak + 300}px)) scale(1.8)`, opacity: 0, offset: 1 }
            ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
        }
        setTimeout(() => span.remove(), dur);
    }
}

function _startParticleRain() {
    const count = 90;
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
        const p = {
            el: document.createElement('div'),
            x: Math.random() * w,
            y: -100 - (Math.random() * 600),
            v: 12 + Math.random() * 20,
            a: (Math.random() - 0.5) * 15,
            rot: Math.random() * 360,
        };
        p.el.className = 'kion-particle';
        p.el.textContent = _celebrationEmojis[Math.floor(Math.random() * _celebrationEmojis.length)];
        p.el.style.fontSize = (15 + Math.random() * 45) + 'px';
        document.body.appendChild(p.el);
        _particles.push(p);
    }
    requestAnimationFrame(_tickParticleRain);
}

function _tickParticleRain() {
    let active = false;
    const h = window.innerHeight;
    _particles = _particles.filter(p => {
        p.y += p.v;
        p.rot += p.a;
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        if (p.y < h + 100) {
            active = true;
            return true;
        } else {
            p.el.remove();
            return false;
        }
    });
    if (active) requestAnimationFrame(_tickParticleRain);
}

// ===== ディグ爆発：宝石噴出 =====
function _triggerGemBurst(gems) {
    gems = gems || ['💎','💎','💎','✨','🔷','💙','⚡'];
    const count = 14;
    for (let i = 0; i < count; i++) {
        const g = document.createElement('span');
        g.className = 'gem-particle';
        const angle = (Math.PI / (count - 1)) * i; // 半円状
        const dist  = 80 + Math.random() * 80;
        const gx    = Math.cos(angle - Math.PI / 2) * dist * 1.8;
        const gy    = -(Math.sin(Math.abs(angle - Math.PI / 2)) * dist + 60);
        g.textContent = gems[i % gems.length];
        g.style.cssText = `--gx:${gx}px;--gy:${gy}px;--delay:${i * 40}ms;font-size:${1.3 + Math.random()*0.5}rem;`;
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 1200);
    }
}

// ===== ダブルタップ演出：💖 波紋（Ping）演出 =====
function _triggerLoveRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-heart-container';
    ripple.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:10005;`;
    
    const heart = document.createElement('span');
    heart.className = 'ripple-heart-emoji';
    heart.textContent = '💖';
    heart.style.cssText = `position:absolute;transform:translate(-50%, -50%) scale(0);font-size:5rem;`;
    
    ripple.appendChild(heart);
    document.body.appendChild(ripple);
    
    void ripple.offsetWidth;
    heart.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    heart.style.transform  = 'translate(-50%, -50%) scale(1.5)';
    heart.style.opacity    = '0';
    
    setTimeout(() => ripple.remove(), 700);
}

// ===== ジャンルピル：クイックジャンルフィルター =====
function quickGenreFilter(genre) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    filterState.genre = genre || null;
    _syncGenrePills(genre);
    filterTrendCards();
    renderActiveFilterTags();
    const hasFilter = filterState.scene !== 'すべて' || filterState.genre !== null || filterState.reaction !== null;
    document.getElementById('filter-dot')?.classList.toggle('hidden', !hasFilter);
}

// ===== Global DIG Interaction: Drag & Drop Reaction Palette =====
function _initGlobalDigInteraction() {
    const container = document.getElementById('global-dig-container');
    const palette = document.getElementById('global-dig-palette');
    const btn = document.getElementById('global-dig-btn');
    if (!container || !palette || !btn) return;

    // パレットの生成
    palette.innerHTML = '';
    NEW_REACTIONS.forEach(reaction => {
        const item = document.createElement('div');
        item.className = 'dig-palette-emoji';
        item.textContent = reaction.emoji;
        item.dataset.label = reaction.label;
        palette.appendChild(item);

        // ドラッグイベントのバインド
        item.addEventListener('pointerdown', e => _handleDigDragStart(e, reaction));
    });

    // DIGボタンのトグル
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = palette.classList.toggle('active');
        btn.classList.toggle('active', isActive);
        if (isActive && kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([15]);
    });

    // パレット外クリックで閉じる
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            palette.classList.remove('active');
            btn.classList.remove('active');
        }
    });
}

let _digGhostEl = null;
let _currentDragReaction = null;
let _lastDropTarget = null;

function _handleDigDragStart(e, reaction) {
    e.preventDefault();
    e.stopPropagation();
    
    _currentDragReaction = reaction;

    // 【Focus: 背景暗転とフォーカスカラー設定】
    const colorMap = {
        '🔥': { hex: '#FF3300', rgb: '255, 51, 0' },
        '👏': { hex: '#FFAAA5', rgb: '255, 170, 165' },
        '💡': { hex: '#FFD700', rgb: '255, 215, 0' },
        '✨': { hex: '#A200FF', rgb: '162, 0, 255' },
        '💎': { hex: '#00F2FF', rgb: '0, 242, 255' }
    };
    _currentColor = colorMap[reaction.emoji] || { hex: '#4A90E2', rgb: '74, 144, 226' };
    document.documentElement.style.setProperty('--focus-rgb', _currentColor.rgb);
    document.body.classList.add('drag-dimming');

    // グラデーションの中身は初期化
    _radCurrent = 0;
    const radialLayer = document.getElementById('radialLayer');
    if (radialLayer) {
        radialLayer.style.transition = 'none';
        radialLayer.style.opacity = '1';
        _radActive = false;
        
        // 核だけ少し膨らませる
        _radTarget = 5;
        _radActive = true;
        requestAnimationFrame(animateRadial);
    }
    
    // ゴースト要素の生成
    _digGhostEl = document.createElement('div');
    _digGhostEl.className = 'drag-ghost';
    _digGhostEl.textContent = reaction.emoji;
    _digGhostEl.style.left = `${e.clientX}px`;
    _digGhostEl.style.top = `${e.clientY}px`;
    _digGhostEl.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.appendChild(_digGhostEl);
    
    if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([20]);

    // グローバルな移動・終了イベント
    window.addEventListener('pointermove', _handleDigDragMove);
    window.addEventListener('pointerup', _handleDigDragEnd);
}

function _handleDigDragMove(e) {
    if (!_digGhostEl) return;
    
    // ゴーストを追従
    _digGhostEl.style.left = `${e.clientX}px`;
    _digGhostEl.style.top = `${e.clientY}px`;
    
    // ヒットテスト (ゴーストを一時的に消して奥の要素を確認)
    _digGhostEl.style.display = 'none';
    const target = document.elementFromPoint(e.clientX, e.clientY);
    _digGhostEl.style.display = 'block';
    
    const card = target?.closest('[data-reactions]');
    
    if (card !== _lastDropTarget) {
        if (_lastDropTarget) _lastDropTarget.classList.remove('drag-focus');
        if (card) {
            card.classList.add('drag-focus');
            if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate(5);
        }
        _lastDropTarget = card;
    }
}

function _handleDigDragEnd(e) {
    window.removeEventListener('pointermove', _handleDigDragMove);
    window.removeEventListener('pointerup', _handleDigDragEnd);
    
    // フォーカス・暗転を解除
    document.body.classList.remove('drag-dimming');
    
    if (!_digGhostEl) return;
    
    const reaction = _currentDragReaction;
    const card = _lastDropTarget;
    
    // 成功時
    if (card && reaction) {
        const display = card.querySelector('[id^="react-display-"]');
        card.classList.remove('drag-focus');
        if (display) {
            _applyNewReaction(reaction, display.id);
            // 成功アニメーション（ゴーストが吸い込まれる演出など）
            _digGhostEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            _digGhostEl.style.transform = 'translate(-50%, -50%) scale(0)';
            _digGhostEl.style.opacity = '0';
        }
    }
    
    // クリーンアップ
    if (card) card.classList.remove('drop-target-highlight');
    setTimeout(() => {
        if (_digGhostEl) _digGhostEl.remove();
        _digGhostEl = null;
    }, 300);
    
    _lastDropTarget = null;
    _currentDragReaction = null;
}

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

    const triggerCard = wrapper.closest('[data-reactions]');
    if (!triggerCard) return;
    const shell = document.getElementById('tiktok-detail-shell');
    const snapContainer = document.getElementById('card-detail-snap');
    if (!shell || !snapContainer) return;

    if (shell.classList.contains('active')) { closeCardDetail(); return; }

    // 表示中のカードを収集
    const allCards = Array.from(
        document.querySelectorAll('#curated-feed-grid > [data-reactions]')
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
    const display   = card.querySelector('[id^="react-display"]');
    const scene     = card.dataset.scene   || '';
    const genre     = card.dataset.genre   || '';
    const context   = card.dataset.context || '';
    const desc      = img?.dataset.desc    || 'コーデの詳細情報がありません';
    const tags      = (img?.dataset.tags || '').split(',').filter(Boolean).map(t => t.trim());
    const displayId = display?.id || '';
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

    const badges = display
        ? Array.from(display.children).map(b => b.outerHTML).join('')
        : '';

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

            <!-- リアクションバー（👍ボタン + バッジ） -->
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid ${divider};">
                <div id="detail-react-${idx}" style="display:flex;gap:5px;flex-wrap:wrap;flex:1;min-height:26px;">
                    ${badges}
                </div>
                <button class="reaction-plus-btn"
                    style="width:38px;height:38px;background:#0060ad;color:white;border-radius:50%;border:none;font-size:19px;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,96,173,0.38);touch-action:none;"
                    data-display-id="${displayId}" data-card-idx="${idx}">👍</button>
            </div>

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
            .filter(el => el !== addCard && el.dataset.reactions !== undefined)
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
    // "+" ボタンのドラッグ委譲
    _initReactionDelegation();
    // カードのElastic Pullリアクション
    _initElasticPull();
    // 既存バッジへの便乗タップ（方法④）
    _initBadgeTap();
    // グローバル DIG リアクション（ドラッグ＆ドロップ）
    _initGlobalDigInteraction();

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
    toggleReaction,
    copyToCloset,
    sortTrendPosts,
    quickDigTag,
    submitPost,
};

/* ==========================================
 *  KION COMMUNITY - FULL COMPONENT ARCHITECTURE
 *  (Migrated from android_trend_final.html)
 *  ========================================== */

const SYSTEM_REACTIONS = [
    { id: 'kawaii', emoji: '💖', label: 'かわいい', color: '#f472b6', rgb: '244,114,182' },
    { id: 'cool',   emoji: '🔥', label: 'カッコいい', color: '#fb923c', rgb: '251,146,60' },
    { id: 'dig',    emoji: '⛏️', label: 'ディグる', color: '#38bdf8', rgb: '56,189,248' },
    { id: 'niche',  emoji: '💎', label: '個性的', color: '#a855f7', rgb: '168,85,247' },
];

const USER_POSTS = [
    {
        id: 1,
        user: 'Mika',
        name: 'OVERSIZE WOOL SHELL',
        tag: '#MORNINGCOMMUTE',
        genre: 'Preppy / 王道',
        mode: 'preppy',
        warmth: 4,
        img: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=700&q=80',
        currentRank: 1,
        prevRank: 3,
        likes: 5200,
        hashtags: ['MorningCommute', 'WoolShell', 'Layering'],
        reactionCounts: { dig: 28, emoi: 46, cool: 72, dress: 35, useful: 18, sense: 14, cute: 22 },
        description: '風が冷たい朝に安心なオーバーサイズシェル。',
        hot: false,
    },
    {
        id: 2,
        user: 'Kou',
        name: 'NEO UTILITY PARKA',
        tag: '#NIGHTRUN',
        genre: 'Minimalist / 個性派',
        mode: 'minimalist',
        warmth: 5,
        img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80',
        currentRank: 2,
        prevRank: 8,
        likes: 7600,
        hashtags: ['Cyberpunk', 'Techwear', 'StreetStyle'],
        reactionCounts: { dig: 54, emoi: 32, cool: 88, dress: 62, useful: 24, sense: 18, cute: 12 },
        description: '防風性能と動きやすさを両立するパーカ。',
        hot: true,
    },
    {
        id: 3,
        user: 'Yui',
        name: 'LANE LINEN SET',
        tag: '#WORKCAMPUS',
        genre: 'Minimalist / 個性派',
        mode: 'minimalist',
        warmth: 3,
        img: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=700&q=80',
        currentRank: 3,
        prevRank: 4,
        likes: 2800,
        hashtags: ['SlowFashion', 'Minimal', 'Linen'],
        reactionCounts: { dig: 22, emoi: 28, cool: 41, dress: 29, useful: 16, sense: 10, cute: 26 },
        description: 'ナチュラルリネンで作る柔らかい通勤スタイル。',
        hot: false,
    },
    {
        id: 4,
        user: 'Sota',
        name: 'SLIM WOOL SUIT',
        tag: '#CITYLOOK',
        genre: 'Preppy / 王道',
        mode: 'preppy',
        warmth: 4,
        img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80',
        currentRank: 4,
        prevRank: 10,
        likes: 6200,
        hashtags: ['Classic', 'Knitwear', 'IvyStyle'],
        reactionCounts: { dig: 66, emoi: 58, cool: 79, dress: 43, useful: 36, sense: 22, cute: 15 },
        description: '洗練されたウールのスリムシルエット。',
        hot: true,
    },
];

class AppController {
    static init() {
        this.overlay = document.getElementById('transition-overlay');
        ReactionModule.init();
        ClosetModule.init();
        ClosetComponent.init();
        DiscoveryModule.init(this);
        TrendModule.init(this);
        
        setTimeout(() => {
            this.changeMode('discover', false);
        }, 100);
    }
    static changeMode(mode, animate = true) {
        if(this.currentMode === mode && animate) return;
        this.currentMode = mode;
        if(navigator.vibrate) navigator.vibrate([15]);
        if (animate && this.overlay) {
            let color = 'rgba(15,23,42,0.95)';
            if(mode === 'preppy') color = 'rgba(37, 99, 235, 0.95)';
            if(mode === 'minimalist') color = 'rgba(168, 85, 247, 0.95)';
            this.overlay.style.backgroundColor = color;
            this.overlay.style.opacity = '1';
            setTimeout(() => {
                DiscoveryModule.updateUI(mode);
                TrendModule.render(mode);
            }, 300);
            setTimeout(() => { this.overlay.style.opacity = '0'; }, 600);
        } else {
            DiscoveryModule.updateUI(mode);
            TrendModule.render(mode);
        }
    }
}

class DiscoveryModule {
    static init(appController) {
        this.app = appController;
        this.container = document.getElementById('discovery-labels-container');
        if(!this.container) return;
        
        const labels = [
            { id: 'preppy', title: '王道派 (Preppy)', icon: 'auto_awesome' },
            { id: 'minimalist', title: '個性派 (Minimalist)', icon: 'diamond' }
        ];

        labels.forEach(l => {
            const btn = document.createElement('button');
            btn.id = `label-btn-${l.id}`;
            btn.className = 'flex-1 py-3 px-2 rounded-2xl border flex flex-col justify-center items-center gap-1 transition-all active:scale-95 shadow-lg overflow-hidden relative backdrop-blur-md';
            btn.innerHTML = `<span class="material-symbols-outlined text-[20px] z-10">${l.icon}</span><span class="text-[13px] font-black tracking-wide z-10">${l.title}</span>`;
            btn.onclick = () => {
                if(this.app.currentMode === l.id) this.app.changeMode('discover');
                else this.app.changeMode(l.id);
            };
            btn.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            this.container.appendChild(btn);
        });
    }

    static updateUI(mode) {
        const pBtn = document.getElementById('label-btn-preppy');
        const mBtn = document.getElementById('label-btn-minimalist');
        if(!pBtn || !mBtn) return;
        
        pBtn.className = mode === 'preppy'
            ? 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all shadow-[0_4px_25px_rgba(37,99,235,0.7)] bg-blue-600 text-white border-blue-400'
            : 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all bg-black/50 text-white/60 border-white/20 backdrop-blur-md active:scale-95';

        mBtn.className = mode === 'minimalist'
            ? 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all shadow-[0_4px_25px_rgba(168,85,247,0.7)] bg-purple-600 text-white border-purple-400'
            : 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all bg-black/50 text-white/60 border-white/20 backdrop-blur-md active:scale-95';
    }
}

class FountainComponent {
    static spawn(cardEl, colorStr, customTags = []) {
        const container = document.getElementById('fountain-container') || document.body;
        const rect = cardEl.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height * 0.3;
        const emojis = ['✨', '🌟', '💫', '⚡', '🔥', '💎', '🌙', '🎯'];
        const defaultTags = ['#VIBES', '#HOT', '#Y2K', '#TREND', '#COOL', '#OMG', '#NEW', '#KION'];
        const tags = Array.from(new Set([...(customTags || []), ...defaultTags]));
        const count = 12;

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'hashtag-fountain';
            // 偶数番はハッシュタグ、奇数番は絵文字でバリエーション
            const useEmoji = i % 4 === 3;
            el.textContent = useEmoji
                ? emojis[Math.floor(Math.random() * emojis.length)]
                : tags[Math.floor(Math.random() * tags.length)];
            el.style.setProperty('--neon-color', colorStr);
            el.style.left = (originX + (Math.random() - 0.5) * 60) + 'px';
            el.style.top = originY + 'px';
            if (useEmoji) {
                el.style.fontSize = '20px';
                el.style.background = 'transparent';
                el.style.border = 'none';
                el.style.backdropFilter = 'none';
                el.style.padding = '0';
            }
            container.appendChild(el);

            // 慣性と空気抵抗を模した物理パラメータ
            const spreadAngle = (Math.random() * 150 - 75) * (Math.PI / 180);
            const launchForce = 180 + Math.random() * 200;
            // X軸：左右の広がり（空気抵抗でドリフト）
            const vx = Math.sin(spreadAngle) * launchForce;
            // Y軸：上方への初速（重力で減衰後にゆっくり落下）
            const vy = -(Math.cos(spreadAngle) * launchForce * 0.9 + 60 + Math.random() * 40);
            // ドリフト：左右に微細な揺らぎ
            const drift = (Math.random() - 0.5) * 60;
            const delay = i * 35;
            // 慣性：初速が高く徐々に減衰するイージング
            const duration = 1600 + Math.random() * 1000;

            el.animate([
                {
                    transform: 'translate(-50%, -50%) scale(0.1) rotate(0deg)',
                    opacity: 0,
                    filter: `blur(4px) drop-shadow(0 0 6px ${colorStr})`
                },
                {
                    opacity: 1,
                    filter: `blur(0px) drop-shadow(0 0 12px ${colorStr})`,
                    offset: 0.06
                },
                {
                    opacity: 0.9,
                    filter: `blur(0px) drop-shadow(0 0 8px ${colorStr})`,
                    offset: 0.55
                },
                {
                    transform: `translate(calc(-50% + ${vx + drift}px), calc(-50% + ${vy + 700}px)) scale(0.7) rotate(${vx / 6}deg)`,
                    opacity: 0,
                    filter: `blur(3px) drop-shadow(0 0 2px ${colorStr})`
                }
            ], {
                duration,
                delay,
                // easeOutQuart 相当：初速大→ゆっくり減衰
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                fill: 'forwards'
            });

            setTimeout(() => el.remove(), duration + delay + 100);
        }
    }
}

class ReactionModule {
    static init() {
        this.dimOverlay = document.getElementById('dim-overlay');
        this.radialLayer = document.getElementById('radial-layer');
        this.emojiActor = document.getElementById('giant-emoji-actor');
    }

    static resolve(type) {
        if (!type) return null;
        if (typeof type === 'string') {
            return Object.values(REACTION_THEME_MASTER).find(r =>
                r.id === type || r.label === type || r.emoji === type || r.icon === type
            ) || null;
        }
        return type;
    }

    static trigger(reactionOrType, displayId, _cardIdx) {
        const reaction = this.resolve(reactionOrType);
        if (!reaction) return;
        if (kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10, 5, 20]);

        const display = document.getElementById(displayId);
        if (display) {
            const existing = Array.from(display.children).find(b => b.textContent.startsWith(reaction.emoji));
            if (existing) {
                const m = existing.textContent.match(/(\d+)$/);
                const n = m ? parseInt(m[1]) + 1 : 1;
                existing.textContent = `${reaction.emoji} ${reaction.label} ${n}`;
            } else {
                const badge = document.createElement('span');
                badge.className = 'reacted-badge reaction-effect-transition animate-[fadeSlideIn_0.3s_ease_forwards]';
                badge.style.cssText = `background:${reaction.bg};color:${reaction.color};transition: background-color 0.5s ease,color 0.5s ease,box-shadow 0.5s ease;`;
                badge.textContent = `${reaction.emoji} ${reaction.label} 1`;
                display.appendChild(badge);
            }
        }

        const card = display?.closest('[data-reactions]');
        if (card) {
            const current = parseInt(card.dataset.reactions || 0) + 1;
            card.dataset.reactions = current;
            const label = card.querySelector('[class*="CURATIONS"]') || Array.from(card.querySelectorAll('span')).find(s => s.textContent.includes('CURATIONS'));
            if (label) {
                const disp = current >= 1000 ? (current/1000).toFixed(1) + 'K' : current;
                label.textContent = `${disp} CURATIONS`;
            }
        }

        if (display) {
            const _snapCont = document.getElementById('card-detail-snap');
            if (_snapCont) {
                const _origCard = display.closest('[data-reactions]');
                if (_origCard) {
                    const _allCards = Array.from(document.querySelectorAll('#curated-feed-grid > [data-reactions]'));
                    const _cIdx = _allCards.indexOf(_origCard);
                    const _detailBadges = _snapCont.querySelector(`#detail-react-${_cIdx}`);
                    if (_detailBadges) _detailBadges.innerHTML = display.innerHTML;
                }
            }
        }

        if (card && card._postcardComponent) {
            card._postcardComponent.applyReaction(reaction);
        }

        this.applyTheme(reaction, card || display);
        const cardTags = card?.dataset?.hashtags ? card.dataset.hashtags.split(',').filter(Boolean) : [];
        FountainComponent.spawn(card || display, reaction.color, cardTags);
        if (reaction.id === 'dig') _triggerGemBurst(reaction.effects);
        _triggerCelebration(reaction, display);
    }

    static applyTheme(reaction, element) {
        if (this.dimOverlay) {
            this.dimOverlay.style.transition = 'background-color 0.5s ease, opacity 0.5s ease';
            this.dimOverlay.style.backgroundColor = reaction.bg;
        }
        if (this.radialLayer) {
            this.radialLayer.style.transition = 'background 0.5s ease, opacity 0.5s ease';
            this.radialLayer.style.background = `radial-gradient(circle at 50% 50%, ${reaction.color} 0%, ${reaction.bg} 40%, transparent 80%)`;
        }
        if (this.emojiActor) {
            this.emojiActor.style.transition = 'color 0.5s ease, transform 0.5s ease';
            this.emojiActor.style.color = reaction.color;
            this.emojiActor.textContent = reaction.emoji;
        }
        if (element && element instanceof HTMLElement) {
            element.classList.add('reaction-effect-transition');
            element.style.transition = 'background-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease';
        }
    }

    static engageFocus(cardEl, reaction) {
        cardEl.classList.add('drag-focus');
        cardEl.style.setProperty('--neon-color', reaction.color);
        cardEl.style.setProperty('--neon-rgb', reaction.rgb || '255,255,255');

        // カードのみモードの場合は全画面レイヤーをスキップ
        if (kionSettings.isFullScreenEffectEnabled) {
            this._applyGradientFlare(reaction.color, 'focus');
            document.querySelectorAll('#trend-view-container .postcard-wrapper').forEach(el => {
                if (el !== cardEl.closest('.postcard-wrapper')) el.classList.add('saturation-decay-bg');
            });
        }
        if (navigator.vibrate) navigator.vibrate([15]);
    }

    static releaseFocus(cardEl) {
        cardEl.classList.remove('drag-focus');
        this._removeGradientFlare();
        document.querySelectorAll('.saturation-decay-bg').forEach(el => el.classList.remove('saturation-decay-bg'));
    }

    static _applyGradientFlare(colorStr, mode = 'focus') {
        let flareEl = document.getElementById('gradient-flare-el');
        if (!flareEl) {
            flareEl = document.createElement('div');
            flareEl.id = 'gradient-flare-el';
            flareEl.className = 'gradient-flare-burst';
            document.body.appendChild(flareEl);
        }
        // テーマカラーを CSS 変数として渡す
        const r = parseInt(colorStr.slice(1,3)||'ff',16);
        const g = parseInt(colorStr.slice(3,5)||'ff',16);
        const b = parseInt(colorStr.slice(5,7)||'ff',16);
        flareEl.style.setProperty('--flare-color', `rgba(${r},${g},${b},0.18)`);
        flareEl.style.setProperty('--flare-color2', `rgba(${r},${g},${b},0.08)`);
        requestAnimationFrame(() => flareEl.classList.add('active'));
    }

    static _removeGradientFlare() {
        const flareEl = document.getElementById('gradient-flare-el');
        if (flareEl) {
            flareEl.classList.remove('active');
            setTimeout(() => flareEl.remove(), 600);
        }
        if (this.dimOverlay) this.dimOverlay.style.opacity = '0';
    }

    static triggerBurst(cardEl, reaction) {
        if (navigator.vibrate) navigator.vibrate([40, 60, 200]);

        // カードのみモードの場合は全画面レイヤーをスキップ
        if (!kionSettings.isFullScreenEffectEnabled) {
            // カードローカルのフラッシュのみ
            _triggerSimpleCelebration(reaction, cardEl);
            setTimeout(() => this.releaseFocus(cardEl), 800);
            return;
        }

        // Gradient Flare バースト（同心円の代替）
        if (this.radialLayer) {
            const rgb = reaction.rgb || '255,255,255';
            this.radialLayer.style.transition = 'none';
            this.radialLayer.style.opacity = '1';
            this.radialLayer.style.background = [
                `radial-gradient(ellipse at 50% 50%, ${reaction.color}CC 0%, transparent 25%)`,
                `radial-gradient(ellipse at 30% 60%, rgba(${rgb},0.35) 0%, transparent 45%)`,
                `radial-gradient(ellipse at 70% 40%, rgba(${rgb},0.2) 0%, transparent 40%)`,
                `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.7) 30%, transparent 75%)`
            ].join(', ');
            requestAnimationFrame(() => {
                this.radialLayer.style.transition = 'opacity 2.8s cubic-bezier(0.4, 0, 0.2, 1)';
                this.radialLayer.style.opacity = '0';
            });
        }

        if (this.emojiActor) {
            this.emojiActor.textContent = reaction.emoji;
            this.emojiActor.style.setProperty('--neon-color', reaction.color);
            this.emojiActor.classList.remove('burst');
            void this.emojiActor.offsetWidth;
            this.emojiActor.classList.add('burst');
        }

        const cardTags = cardEl?.dataset?.hashtags ? cardEl.dataset.hashtags.split(',').filter(Boolean) : [];
        FountainComponent.spawn(cardEl, reaction.color, cardTags);
        setTimeout(() => this.releaseFocus(cardEl), 800);
    }
}

class ClosetModule {
    static STORAGE_KEY = typeof CLOSET_KEY !== 'undefined' ? CLOSET_KEY : 'kion_saved_trend_items';
    static items = [];

    static init() {
        this.container = document.getElementById('closet-list');
        this.items = this.loadItems();
        this.seedDefaultItems();
        this.render();
    }

    static loadItems() {
        if (typeof window.closetItems !== 'undefined') {
            return closetItems;
        }
        try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); } catch { return []; }
    }

    static saveItems() {
        if (typeof window.closetItems !== 'undefined') {
            if (typeof saveCloset === 'function') saveCloset();
            return;
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    }

    static seedDefaultItems() {
        const defaultItems = [
            { id: 10001, name: 'Vintage Denim Jacket', category: 'outer', color: '#1e3a8a', colorName: 'ネイビー', memo: 'これ着るで保存', img: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=500&q=80', tags: ['90s', 'Vintage', 'DenimLove'], addedAt: new Date().toLocaleDateString('ja-JP') },
            { id: 10002, name: 'Cyber Street Boots', category: 'shoes', color: '#111111', colorName: 'ブラック', memo: 'これ着るでキープ', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80', tags: ['Cyberpunk', 'Techwear', 'StreetStyle'], addedAt: new Date().toLocaleDateString('ja-JP') },
        ];

        if (typeof window.closetItems !== 'undefined') {
            if (closetItems.length === 0) {
                closetItems = defaultItems.concat(closetItems);
                if (typeof saveCloset === 'function') saveCloset();
            }
            return;
        }

        if (this.items.length === 0) {
            this.items = defaultItems;
            this.saveItems();
        }
    }

    static getItems() {
        return typeof window.closetItems !== 'undefined' ? closetItems : this.items;
    }

    static addItem(obj) {
        const item = Object.assign({ id: Date.now(), category: 'other', color: '#888888', colorName: '', memo: 'これ着るで保存', tags: [], addedAt: new Date().toLocaleDateString('ja-JP') }, obj);
        if (typeof window.closetItems !== 'undefined') {
            closetItems.unshift(item);
            if (typeof saveCloset === 'function') saveCloset();
        } else {
            this.items.unshift(item);
            this.saveItems();
        }
        if (typeof renderClosetGrid === 'function') renderClosetGrid();
        this.render();
        if (typeof ClosetComponent !== 'undefined' && ClosetComponent.render) ClosetComponent.render();
    }

    static render() {
        if(!this.container) return;
        const items = this.getItems();
        if (!items || items.length === 0) {
            this.container.innerHTML = '<p class="text-[10px] text-white/30 italic py-6 px-2">まだ保存されていません。</p>';
            return;
        }
        this.container.innerHTML = '';
        items.forEach(item => {
            const tags = item.tags ? item.tags.slice(0, 3).map(t => `<span class="text-[8px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">#${t}</span>`).join(' ') : '';
            const labelText = item.label || item.name || '保存済みアイテム';
            const el = document.createElement('div');
            el.className = 'w-[80px] h-[80px] rounded-[24px] flex-shrink-0 border border-white/10 overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.5)] card-enter relative';
            el.innerHTML = `
                <img src="${item.img}" class="w-full h-full object-cover">
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-3 pb-2 px-2">
                    <p class="text-[8px] font-bold text-white truncate">${labelText}</p>
                    <div class="flex flex-wrap gap-1 mt-1">${tags}</div>
                </div>`;
            this.container.appendChild(el);
        });
    }
}

class ClosetComponent {
    static init() {
        this.panel = document.getElementById('closet-panel');
        this.grid = document.getElementById('closet-items-grid');
        this.empty = document.getElementById('closet-empty');
        this.toggleBtn = document.getElementById('closet-toggle-btn');
        this.isOpen = true;
        this.render();
    }

    static getItems() {
        return ClosetModule.getItems();
    }

    static addSavedItem(item) {
        ClosetModule.addItem(item);
        this.render();
    }

    static toggle() {
        if (!this.panel) return;
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('closet-open', this.isOpen);
        if (this.toggleBtn) {
            this.toggleBtn.textContent = this.isOpen ? 'Hide Closet' : 'Show Closet';
        }
    }

    static render() {
        if (!this.grid || !this.empty) return;
        const items = this.getItems();
        if (!items || items.length === 0) {
            this.grid.innerHTML = '';
            this.empty.classList.remove('hidden');
            return;
        }
        this.empty.classList.add('hidden');
        this.grid.innerHTML = items.map(item => {
            const tags = item.tags ? item.tags.slice(0, 2).map(t => `<span class="text-[8px] px-2 py-0.5 rounded-full bg-slate-900/70 text-white/80">#${t}</span>`).join(' ') : '';
            const labelText = item.label || item.name || 'Saved Item';
            return `
                <div class="rounded-[28px] overflow-hidden border border-black/10 dark:border-white/10 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    <div class="aspect-[3/4] overflow-hidden bg-slate-200 dark:bg-slate-900">
                        <img src="${item.img}" class="w-full h-full object-cover" />
                    </div>
                    <div class="p-3 space-y-2">
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant dark:text-white/60">${labelText}</p>
                        <div class="flex flex-wrap gap-1">${tags}</div>
                    </div>
                </div>`;
        }).join('');
    }
}

class PostcardComponent {
    constructor(data, mode) {
        this.data = Object.assign({ reactionCounts: { dig: 0, emoi: 0, cool: 0, dress: 0, useful: 0, sense: 0, cute: 0 } }, data);
        this.mode = mode;
        this.el = document.createElement('div');
        this.el._postcardComponent = this;
        this.el.dataset.postId = this.data.id;
        this.el.dataset.genre = this.data.genre;
        this.el.dataset.mode = this.data.mode;
        this.el.dataset.hashtags = (this.data.hashtags || []).join(',');
        this.el.dataset.reactions = this.getTotalReactions();
        this.isTrendingUp = (this.data.prevRank - this.data.currentRank) >= 3;
        this.buildLayout();
        this.bindEvents();
        this.updateReactionGraph();
    }

    getTotalReactions() {
        return Object.values(this.data.reactionCounts || {}).reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
    }

    formatCount(value) {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return `${value}`;
    }

    buildGraphRows() {
        const counts = this.data.reactionCounts || {};
        const maxCount = Math.max(...Object.values(counts), 1);
        return Object.values(REACTION_THEME_MASTER).map(reaction => {
            const count = counts[reaction.id] || 0;
            const width = Math.max(10, Math.round((count / maxCount) * 100));
            return `
                <div class="reaction-bar-row">
                    <div class="reaction-bar-row-label">
                        <span>${reaction.emoji} ${reaction.label}</span>
                        <span class="reaction-count-${reaction.id}">${this.formatCount(count)}</span>
                    </div>
                    <div class="reaction-bar-track">
                        <div class="reaction-bar-fill" data-reaction="${reaction.id}" style="width:${width}%; background:${reaction.bg}; box-shadow: 0 0 22px ${reaction.color};"></div>
                    </div>
                </div>`;
        }).join('');
    }

    buildLayout() {
        const scaleBoost = this.isTrendingUp ? 1.15 : 1;
        this.el.className = 'postcard-wrapper bg-transparent relative card-enter transition-all';
        this.el.style.transform = `scale(${scaleBoost})`;

        // 全角 ＃ + 全角数字でランク画像
        const fw = ['０','１','２','３','４','５','６','７','８','９'];
        const rankText = '＃' + String(this.data.currentRank).split('').map(d => fw[parseInt(d)] || d).join('');
        const rankClass = this.data.currentRank <= 3 ? `rank-${this.data.currentRank}` : '';

        const UPBadge = this.isTrendingUp
            ? `<span class="bg-gradient-to-r from-rose-500 to-orange-400 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm"><span class="material-symbols-outlined text-[9px]">trending_up</span>+${this.data.prevRank - this.data.currentRank}</span>`
            : '';
        const hashtagHtml = (this.data.hashtags || []).map(tag => `<span class="text-[8px] font-bold uppercase text-white/75 bg-white/8 px-2 py-0.5 rounded-full border border-white/10">#${tag}</span>`).join(' ');
        const hotBadge = this.data.hot ? `<span class="absolute left-3 top-3 bg-red-500/85 text-white text-[8px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm z-10">急上昇</span>` : '';
        const warmthStars = '★'.repeat(this.data.warmth || 4) + '☆'.repeat(5 - (this.data.warmth || 4));
        const totalReactions = this.getTotalReactions();
        const likesDisplay = this.data.likes >= 1000 ? `${(this.data.likes / 1000).toFixed(1)}K` : this.data.likes;

        this.el.innerHTML = `
            <div class="flip-card-container">
                <div class="flip-card">
                    <div class="flip-card-face flip-card-front" style="background:transparent;">
                        <!-- メインイメージ -->
                        <div class="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/5 shadow-xl">
                            <img src="${this.data.img}" class="w-full h-full object-cover">
                            <!-- グラデーションオーバーレイ（シックな多層） -->
                            <div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.92) 85%);"></div>

                            ${hotBadge}

                            <!-- ランク＆ユーザーバッジ -->
                            <div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                                <span class="trend-rank-badge ${rankClass}" style="font-size:1.1rem;">${rankText}</span>
                                ${UPBadge}
                            </div>

                            <!-- コンテンツ -->
                            <div class="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2">
                                <p class="text-white/50 text-[9px] font-bold uppercase tracking-[0.2em]">${this.data.genre}</p>
                                <p class="text-white font-black text-[15px] leading-tight" style="font-family:'Zen Kaku Gothic New','Noto Sans JP',sans-serif; letter-spacing:-0.02em;">${this.data.name}</p>
                                <p class="text-white/60 text-[10px] font-bold leading-snug">${this.data.description}</p>
                                <div class="flex flex-wrap gap-1 mt-0.5">${hashtagHtml}</div>
                                <div class="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
                                    <span class="text-white/55 text-[10px] font-bold flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[12px]">account_circle</span>@${this.data.user}
                                    </span>
                                    <div class="flex items-center gap-3">
                                        <span class="text-white/55 text-[10px] font-bold flex items-center gap-0.5">
                                            <span class="material-symbols-outlined text-[11px] text-amber-400">favorite</span>${likesDisplay}
                                        </span>
                                        <span class="text-white/55 text-[10px] font-bold flex items-center gap-0.5">
                                            <span class="material-symbols-outlined text-[11px] text-primary/70">local_fire_department</span>${this.formatCount(totalReactions)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- トータルバッジ -->
                            <div class="total-reaction-badge">${this.formatCount(totalReactions)} DIG</div>
                        </div>

                        <!-- アクション行 -->
                        <div class="mt-3 flex gap-2">
                            <button class="flip-toggle-btn flex-1 rounded-xl border border-black/8 dark:border-white/10 bg-white/80 dark:bg-white/5 text-[10px] font-black text-slate-700 dark:text-white/80 py-2.5 active:scale-95 transition-all backdrop-blur-sm tracking-wider uppercase">Analytics</button>
                            <button class="adapt-btn flex-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black py-2.5 active:scale-95 transition-all tracking-wider uppercase">Adapt</button>
                        </div>
                        <div id="post-react-display-${this.data.id}" class="flex flex-wrap gap-2 mt-2"></div>
                    </div>

                    <!-- 裏面 -->
                    <div class="flip-card-face flip-card-back text-white relative p-4">
                        <div class="reaction-graph-panel">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <p class="text-[9px] uppercase tracking-[0.3em] font-black text-blue-400">リアクション分析</p>
                                    <p class="text-sm font-black text-white mt-1" style="font-family:'Zen Kaku Gothic New','Noto Sans JP',sans-serif;">${this.data.name}</p>
                                </div>
                                <button class="flip-toggle-btn border border-white/15 bg-white/8 text-white/80 px-3 py-1.5 rounded-full text-[9px] font-bold active:scale-95 transition-all tracking-wider">← FRONT</button>
                            </div>
                            ${this.buildGraphRows()}
                        </div>
                        <div class="flip-card-cta mt-3">
                            <button class="back-dig-btn rounded-xl border border-white/12 bg-white/6 text-white/80 py-2.5 font-bold text-[10px] active:scale-95 transition-all tracking-wider">DIG ⛏️</button>
                            <button class="back-save-btn rounded-xl bg-emerald-500/90 text-white py-2.5 font-bold text-[10px] active:scale-95 transition-all tracking-wider">ADAPT to Closet</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const flipButtons = this.el.querySelectorAll('.flip-toggle-btn');
        flipButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFlip();
            });
        });

        const adaptBtn = this.el.querySelector('.adapt-btn');
        const backSaveBtn = this.el.querySelector('.back-save-btn');
        const backDigBtn = this.el.querySelector('.back-dig-btn');
        const displayId = `post-react-display-${this.data.id}`;

        if (adaptBtn) {
            adaptBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAdapt();
            });
        }

        if (backSaveBtn) {
            backSaveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate([20, 30]);
                ClosetComponent.addSavedItem({ img: this.data.img, label: this.data.name || `@${this.data.user}`, tags: this.data.hashtags, memo: 'ADAPT で保存' });
                ReactionModule.trigger('dress', displayId, this.data.id);
                backSaveBtn.textContent = 'SAVED';
                backSaveBtn.disabled = true;
            });
        }

        if (backDigBtn) {
            backDigBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ReactionModule.trigger('dig', displayId, this.data.id);
            });
        }

        this.el.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.toggleFlip();
            }
        });

        this.el.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.el.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
    }

    toggleFlip() {
        const card = this.el.querySelector('.flip-card');
        if (!card) return;
        card.classList.toggle('flipped');
    }

    handleAdapt() {
        ClosetComponent.addSavedItem({ img: this.data.img, label: this.data.name || `@${this.data.user}`, tags: this.data.hashtags, memo: 'ADAPT で保存' });
        const displayId = `post-react-display-${this.data.id}`;
        ReactionModule.trigger('dress', displayId, this.data.id);
        const adaptBtn = this.el.querySelector('.adapt-btn');
        if (adaptBtn) {
            adaptBtn.textContent = 'SAVED';
            adaptBtn.disabled = true;
        }
    }

    applyReaction(reaction) {
        const key = reaction.id;
        if (!this.data.reactionCounts[key]) this.data.reactionCounts[key] = 0;
        this.data.reactionCounts[key] += 1;
        this.el.dataset.reactions = this.getTotalReactions();
        this.updateReactionGraph();
    }

    updateReactionGraph() {
        const counts = this.data.reactionCounts || {};
        const maxCount = Math.max(...Object.values(counts), 1);
        const total = this.getTotalReactions();

        const totalBadge = this.el.querySelector('.total-reaction-badge');
        if (totalBadge) {
            totalBadge.textContent = `TOTAL ${this.formatCount(total)}`;
            totalBadge.classList.add('pulse');
            setTimeout(() => totalBadge.classList.remove('pulse'), 450);
        }

        Object.values(REACTION_THEME_MASTER).forEach(reaction => {
            const count = counts[reaction.id] || 0;
            const width = Math.max(10, Math.round((count / maxCount) * 100));
            const fill = this.el.querySelector(`.reaction-bar-fill[data-reaction="${reaction.id}"]`);
            const label = this.el.querySelector(`.reaction-count-${reaction.id}`);
            if (fill) fill.style.width = `${width}%`;
            if (label) label.textContent = this.formatCount(count);
        });
    }

    onPointerDown(e) {
        if (e.target.closest('button')) return;
        e.preventDefault();
        this.el.setPointerCapture(e.pointerId);
        this.startX = e.clientX;
        this.pulling = false;
        this.activeReaction = null;
        this.arcEl = null;

        ReactionModule.engageFocus(this.el, SYSTEM_REACTIONS[2]);
        this._onMove = this.onPointerMove.bind(this);
        this._onUp = this.onPointerUp.bind(this);
        this.el.addEventListener('pointermove', this._onMove);
        this.el.addEventListener('pointerup', this._onUp, { once: true });
        this.el.addEventListener('pointercancel', this._onUp, { once: true });
    }

    onPointerMove(e) {
        const dx = e.clientX - this.startX;
        if (Math.abs(dx) < 15) return;
        if (!this.pulling) { this.pulling = true; this.showPullArc(); }

        const resist = dx > 130 ? 130 + (dx - 130) * 0.15 : dx * 0.6;
        const computedBaseScale = this.isTrendingUp ? 1.15 : 1;
        this.el.style.transform = `translateX(${resist}px) scale(${computedBaseScale}) translateY(-5px)`;

        if (this.arcEl) {
            this.arcEl.style.pointerEvents = 'none';
            const hit = document.elementFromPoint(e.clientX, e.clientY);
            this.arcEl.style.pointerEvents = '';
            const btn = hit?.closest('.pull-fan-btn');
            if (btn) {
                const rId = btn.dataset.rid;
                if (this.activeReaction?.id !== rId) {
                    this.arcEl.querySelectorAll('.pull-fan-btn').forEach(b => b.classList.remove('drag-selected'));
                    btn.classList.add('drag-selected');
                    this.activeReaction = SYSTEM_REACTIONS.find(r => r.id === rId);
                    ReactionModule.engageFocus(this.el, this.activeReaction);
                }
            }
        }
    }

    onPointerUp(e) {
        this.el.removeEventListener('pointermove', this._onMove);
        const computedBaseScale = this.isTrendingUp ? 1.2 : 1;
        this.el.style.transform = `scale(${computedBaseScale})`;
        if (this.arcEl) this.arcEl.remove();

        if (this.activeReaction) ReactionModule.triggerBurst(this.el, this.activeReaction);
        else ReactionModule.releaseFocus(this.el);
    }

    showPullArc() {
        const rect = this.el.getBoundingClientRect();
        this.arcEl = document.createElement('div');
        this.arcEl.className = 'pull-arc-container';
        this.arcEl.style.left = `${rect.left + 50}px`;
        this.arcEl.style.top = `${rect.top + rect.height / 2}px`;

        const offsets = [ { x: 20, y: -85 }, { x: 60, y: -40 }, { x: 60, y: 40 }, { x: 20, y: 85 } ];
        SYSTEM_REACTIONS.forEach((r, i) => {
            const btn = document.createElement('div');
            btn.className = 'pull-fan-btn w-[52px] h-[52px] rounded-full flex items-center justify-center text-[24px] bg-slate-900 border border-white text-white drop-shadow-xl';
            btn.style.setProperty('--fx', offsets[i].x + 'px');
            btn.style.setProperty('--fy', offsets[i].y + 'px');
            btn.style.setProperty('--neon-color', r.color);
            btn.dataset.rid = r.id;
            btn.textContent = r.emoji;
            this.arcEl.appendChild(btn);
        });
        document.body.appendChild(this.arcEl);
        if (navigator.vibrate) navigator.vibrate(10);
    }
}

class TrendModule {
    static init(appController) {
        this.app = appController;
        this.container = document.getElementById('trend-view-container');
    }

    static render(mode) {
        if(!this.container) return;
        this.container.innerHTML = '';
        let filteredData = USER_POSTS.filter(post => mode === 'discover' ? true : post.mode === mode);

        if (mode === 'preppy') {
            filteredData.sort((a,b) => (b.hot === a.hot ? b.likes - a.likes : (b.hot ? 1 : -1)));
            this.container.className = 'grid grid-cols-1 gap-4 pb-4 mt-4';
        } else if (mode === 'minimalist') {
            filteredData.sort((a,b) => (b.hot === a.hot ? b.likes - a.likes : (b.hot ? 1 : -1)));
            this.container.className = 'grid grid-cols-2 gap-3 pb-4 mt-4';
        } else {
            filteredData.sort((a,b) => b.likes - a.likes);
            this.container.className = 'grid grid-cols-2 gap-4 pb-4 mt-4';
        }

        filteredData.forEach((data, index) => {
            const card = new PostcardComponent(data, mode);
            card.el.dataset.cardIdx = index;
            card.el.style.animationDelay = `${index * 0.05}s`;
            this.container.appendChild(card.el);
        });

        this.bumpCards();
    }

    static bumpCards() {
        if (!this.container) return;
        Array.from(this.container.children).forEach(card => {
            card.classList.add('sort-bounce');
            card.addEventListener('animationend', () => card.classList.remove('sort-bounce'), { once: true });
        });
    }
}


