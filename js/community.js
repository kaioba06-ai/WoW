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
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([8]);
    document.getElementById('discover-qa').style.display    = tab === 'qa'    ? 'block' : 'none';
    document.getElementById('discover-trend').style.display = tab === 'trend' ? 'block' : 'none';

    const ACTIVE   = 'flex-1 py-3 border-b-[3px] border-primary dark:border-blue-400 text-primary dark:text-blue-400 font-extrabold text-[12px] tracking-widest text-center transition-all';
    const INACTIVE = 'flex-1 py-3 border-b-[3px] border-transparent text-on-surface-variant dark:text-white/50 font-bold text-[12px] tracking-widest text-center hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg transition-all';

    document.getElementById('tab-btn-trend').className = tab === 'trend' ? ACTIVE : INACTIVE;
    document.getElementById('tab-btn-qa').className    = tab === 'qa'    ? ACTIVE : INACTIVE;
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
    document.getElementById('filter-dot')?.classList.remove('hidden');
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
        switchTab('discover', document.querySelectorAll('.nav-item')[3]);
        switchCommunityTab(type === 'qa' ? 'qa' : 'trend');
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

let currentSortMode = 'hot';

function setSortMode(mode) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([6]);
    currentSortMode = mode;
    const HOT_ON  = 'px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-primary dark:text-blue-300 shadow-sm transition-all';
    const HOT_OFF = 'px-2.5 py-1 rounded-full text-on-surface-variant dark:text-white/50 transition-all';
    document.getElementById('sort-btn-hot').className = mode === 'hot' ? HOT_ON : HOT_OFF;
    document.getElementById('sort-btn-new').className = mode === 'new' ? HOT_ON : HOT_OFF;
    sortTrendPosts();
}

function sortTrendPosts() {
    const trendGrid = document.querySelector('#discover-trend .grid');
    if(!trendGrid) return;
    const addCard = Array.from(trendGrid.children).find(el => el.classList.contains('add-post-card')) || trendGrid.lastElementChild;
    const posts = Array.from(trendGrid.children).filter(el => el !== addCard && el.dataset.reactions !== undefined);

    if (currentSortMode === 'new') {
        posts.sort((a, b) => parseInt(b.dataset.postedAt || 0) - parseInt(a.dataset.postedAt || 0));
    } else {
        posts.sort((a, b) => parseInt(b.dataset.reactions || 0) - parseInt(a.dataset.reactions || 0));
    }
    posts.forEach(p => trendGrid.insertBefore(p, addCard));
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
        name: name || 'コミュニティコーデ',
        category: 'other',
        color: '#888888',
        colorName: '',
        memo: 'コミュニティより保存',
        img: imgSrc || '',
        addedAt: new Date().toLocaleDateString('ja-JP')
    };
    closetItems.unshift(item);
    saveCloset();
    renderClosetGrid();
    btn.dataset.saved = '1';
    btn.classList.remove('text-primary', 'dark:text-blue-400');
    btn.classList.add('text-emerald-500', 'bg-emerald-50', '!border-emerald-300');
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]" style="font-variation-settings:\'FILL\' 1">check_circle</span>';
    alert(`「${item.name}」をクローゼットに保存しました！`);
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

// ===== 新 6 リアクション定義（演出用絵文字セット付き） =====
const NEW_REACTIONS = [
    { emoji: '💖', label: 'かわいい',  color: '#FF69B4', bg: '#FFE4F0', effects: ['💖','🎀','🍭'] },
    { emoji: '😎', label: 'クール',    color: '#1A1A1A', bg: '#E8E8E8', effects: ['😎','⚡','🕶️'] },
    { emoji: '🎨', label: 'エモい',    color: '#8A2BE2', bg: '#F0E6FF', effects: ['🌆','📸','✨'] },
    { emoji: '✅', label: 'これ着る',  color: '#32CD32', bg: '#E6FFE6', effects: ['✅','👕','👗'] },
    { emoji: '⛏️', label: 'ディグる',  color: '#1E90FF', bg: '#E6F3FF', effects: ['💎','⛏️','🌟'] },
    { emoji: '☔', label: '助かる',    color: '#00CED1', bg: '#E0FAFA', effects: ['☔','🌡️','🧤'] },
];

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

function _applyNewReaction(reaction, displayId, _cardIdx) {
    if(kionSettings.isHapticEnabled && navigator.vibrate) navigator.vibrate([10, 5, 20]);

    // バッジを更新
    const display = document.getElementById(displayId);
    if (display) {
        // 同じリアクションが既にあればカウントアップ、なければ追加
        const existing = Array.from(display.children).find(b => b.textContent.startsWith(reaction.emoji));
        if (existing) {
            const m = existing.textContent.match(/(\d+)$/);
            const n = m ? parseInt(m[1]) + 1 : 1;
            existing.textContent = `${reaction.emoji} ${reaction.label} ${n}`;
        } else {
            const badge = document.createElement('span');
            badge.className = 'reacted-badge animate-[fadeSlideIn_0.3s_ease_forwards]';
            badge.style.cssText = `background:${reaction.bg};color:${reaction.color};`;
            badge.textContent = `${reaction.emoji} ${reaction.label} 1`;
            display.appendChild(badge);
        }
    }

    // CURATIONS カウントアップ
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

    // 詳細画面が開いていれば対応スライドのバッジも同期
    const _snapCont = document.getElementById('card-detail-snap');
    if (_snapCont && display) {
        const _origCard = display.closest('[data-reactions]');
        if (_origCard) {
            const _allCards = Array.from(document.querySelectorAll('#curated-feed-grid > [data-reactions]'));
            const _cIdx = _allCards.indexOf(_origCard);
            const _detailBadges = _snapCont.querySelector(`#detail-react-${_cIdx}`);
            if (_detailBadges) _detailBadges.innerHTML = display.innerHTML;
        }
    }

    // ⛏️ ディグる → 宝石爆発（effects配列を使用）
    if (reaction.label === 'ディグる') {
        _triggerGemBurst(reaction.effects);
    }

    // 全リアクション → セレブレーション（アンカーはdisplay要素）
    _triggerCelebration(reaction, display);
}

// ===== セレブレーション：フラッシュ + 巨大絵文字 + パーティクル降下 =====
function _triggerCelebration(reaction, anchorEl) {
    const effectEmojis = reaction.effects || [reaction.emoji];

    if (kionSettings.isFullScreenEffectEnabled) {
        // フルスクリーンモード：画面フラッシュ + 巨大絵文字 + 全画面パーティクル降下
        const flash = document.createElement('div');
        flash.id = 'reaction-flash';
        flash.style.background = reaction.bg;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1800);

        // 巨大絵文字：出現 → 震え → 落下
        _triggerBigEmoji(reaction);

        const count = 22;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            p.className = 'reaction-particle';
            p.textContent = effectEmojis[Math.floor(Math.random() * effectEmojis.length)];
            p.style.cssText = `
                left: ${5 + Math.random() * 90}vw;
                --dur: ${1.4 + Math.random() * 0.8}s;
                --delay: ${Math.random() * 0.5}s;
                font-size: ${1.2 + Math.random() * 0.8}rem;
            `;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 2500);
        }
    } else {
        // カードのみモード：カード内に小さなパーティクルバースト
        const card = anchorEl?.closest('[data-reactions]');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const count = 8;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            p.style.cssText = `
                position:fixed;
                left:${rect.left + Math.random() * rect.width}px;
                top:${rect.top + Math.random() * rect.height * 0.5}px;
                font-size:${0.8 + Math.random() * 0.5}rem;
                pointer-events:none;
                z-index:9998;
                animation:particleFall ${0.7 + Math.random() * 0.4}s ease-in ${Math.random() * 0.2}s forwards;
            `;
            p.textContent = effectEmojis[Math.floor(Math.random() * effectEmojis.length)];
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1200);
        }
    }
}

// ===== 巨大絵文字：画面上部に出現 → 中央で震え → 下部へ落下 =====
function _triggerBigEmoji(reaction) {
    if (!kionSettings.isFullScreenEffectEnabled) return;
    const effectEmojis = reaction.effects || [reaction.emoji];
    const el = document.createElement('span');
    el.className = 'big-emoji-actor phase-enter';
    el.textContent = effectEmojis[0];
    document.body.appendChild(el);

    // → 震えフェーズ（エフェクト絵文字[1]に切り替え）
    setTimeout(() => {
        el.classList.remove('phase-enter');
        void el.offsetWidth; // reflow to restart animation
        el.classList.add('phase-shake');
        if (effectEmojis.length > 1) el.textContent = effectEmojis[1];
    }, 600);

    // → 落下フェーズ（エフェクト絵文字[2]に切り替え）
    setTimeout(() => {
        el.classList.remove('phase-shake');
        void el.offsetWidth;
        el.classList.add('phase-fall');
        if (effectEmojis.length > 2) el.textContent = effectEmojis[2];
    }, 1100);

    setTimeout(() => el.remove(), 1800);
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
    // 投稿一覧を初期レンダリング
    renderQaPosts();
    renderTrendPosts();
    // フィルター状態を同期
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
