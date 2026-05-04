// ===== コミュニティ・投稿モーダル・フィルター =====

function switchCommunityTab(tab) {
    if(navigator.vibrate) navigator.vibrate([8]);
    document.getElementById('discover-qa').style.display    = tab === 'qa'    ? 'block' : 'none';
    document.getElementById('discover-trend').style.display = tab === 'trend' ? 'block' : 'none';

    const ACTIVE   = 'flex-1 py-3 border-b-[3px] border-primary dark:border-blue-400 text-primary dark:text-blue-400 font-extrabold text-[12px] tracking-widest text-center transition-all';
    const INACTIVE = 'flex-1 py-3 border-b-[3px] border-transparent text-on-surface-variant dark:text-white/50 font-bold text-[12px] tracking-widest text-center hover:bg-black/5 dark:hover:bg-white/5 rounded-t-lg transition-all';

    document.getElementById('tab-btn-trend').className = tab === 'trend' ? ACTIVE : INACTIVE;
    document.getElementById('tab-btn-qa').className    = tab === 'qa'    ? ACTIVE : INACTIVE;
}

// ===== スマートフィルター =====
const filterState = { scene: 'すべて', temp: '15mid', purpose: null };

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
    if(navigator.vibrate) navigator.vibrate([8]);
    document.querySelectorAll(`.${group}`).forEach(b => {
        b.classList.remove('bg-primary','text-white','shadow-sm','ring-2','ring-primary/30');
        b.classList.add('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
    });
    btn.classList.add('bg-primary','text-white','shadow-sm');
    btn.classList.remove('bg-white','dark:bg-slate-800','border','border-black/5','dark:border-white/5','dark:text-white');
    filterState[group.replace('sheet-','')] = btn.dataset.value;
}

function applyFilters() {
    const hasFilter = filterState.scene !== 'すべて' || filterState.purpose !== null;
    document.getElementById('filter-dot').classList.toggle('hidden', !hasFilter);
    toggleFilterSheet();
    alert(`フィルター適用：${filterState.scene} / ${filterState.temp} / ${filterState.purpose || 'すべて'}`);
}

function applyVibeFilter(vibe) {
    if(navigator.vibrate) navigator.vibrate([10]);
    alert(`「${vibe}」のコーデを表示します`);
}

// ===== 投稿モーダル =====
let currentModalTab = 'qa';

function openPostModal(tab) {
    if(navigator.vibrate) navigator.vibrate([10]);
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

function selectTemp(el, val) {
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

// 文字数カウント
window.addEventListener('sectionsLoaded', () => {
    const qaText = document.getElementById('qa-text');
    if (qaText) {
        qaText.addEventListener('input', function() {
            document.getElementById('qa-char').textContent = `${this.value.length} / 200`;
            if(this.value.length > 200) this.value = this.value.slice(0, 200);
        });
    }

    const trendText = document.getElementById('trend-text');
    if (trendText) {
        trendText.addEventListener('input', function() {
            document.getElementById('trend-char').textContent = `${this.value.length} / 150`;
            if(this.value.length > 150) this.value = this.value.slice(0, 150);
        });
    }
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

// 自分の投稿を保存
function saveMyPost(postData) {
    const posts = JSON.parse(localStorage.getItem('kion_my_posts') || '[]');
    posts.unshift(postData);
    localStorage.setItem('kion_my_posts', JSON.stringify(posts));
}

// 投稿送信
function submitPost(type) {
    if(navigator.vibrate) navigator.vibrate([10,5,20]);
    if(type === 'qa') {
        const text = document.getElementById('qa-text').value.trim();
        if(!text) { shakeElement(document.getElementById('qa-text')); return; }
        const temp = getSelectedTemp('modal-form-qa');
        const tags = getSelectedTags('modal-form-qa');
        const postData = {
            id: Date.now(),
            type: 'qa',
            text: text,
            temp: temp,
            tags: tags,
            date: new Date().toISOString()
        };
        saveMyPost(postData);
        addQaPost(text, temp, tags);
        document.getElementById('qa-text').value = '';
        document.getElementById('qa-char').textContent = '0 / 200';
        document.querySelectorAll('#modal-form-qa .tag-btn').forEach(b => b.classList.remove('selected-tag'));
    } else {
        const text = document.getElementById('trend-text').value.trim();
        const imgSrc = document.getElementById('photo-preview-img').src;
        if(!text && !imgSrc) { shakeElement(document.getElementById('trend-text')); return; }
        const temp = getSelectedTemp('modal-form-trend');
        const postData = {
            id: Date.now(),
            type: 'trend',
            text: text,
            temp: temp,
            img: imgSrc || null,
            date: new Date().toISOString()
        };
        saveMyPost(postData);
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

function addTrendPost(text, temp, imgSrc) {
    const trendGrid = document.querySelector('#discover-trend .grid');
    const addCard = trendGrid.lastElementChild;
    const card = document.createElement('div');
    card.className = 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[20px] overflow-hidden border border-white/50 dark:border-white/10 shadow-sm relative group flex flex-col animate-[fadeSlideIn_0.4s_ease_forwards]';
    card.innerHTML = `
        ${imgSrc ? `<div class="relative cursor-pointer"><img class="w-full h-36 object-cover" src="${imgSrc}"/><div class="absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded text-[8px] font-extrabold shadow-md">NEW ✨</div><button onclick="copyToCloset(this,'${imgSrc.replace(/'/g,"\\'")}','${text.replace(/'/g,"\\'").slice(0,20) || 'シェアコーデ'}')" class="save-closet-btn absolute top-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-primary dark:text-blue-400 w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border border-white/50"><span class="material-symbols-outlined text-[16px]">hanger</span></button></div>` : ''}
        <div class="px-3 py-2 text-[10px] font-bold dark:text-white/80 text-on-surface-variant leading-snug">${text.replace(/</g,'&lt;')}</div>
        <div class="flex gap-1.5 overflow-x-auto no-scrollbar px-2 py-2 items-center bg-white/40 dark:bg-slate-800/50 mt-auto">
            <button onclick="this.innerHTML='❤️ いいね 1'" class="flex-shrink-0 bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 px-2.5 py-1 rounded-full text-[9px] font-bold border border-pink-200 dark:border-pink-800 active:scale-95 transition-transform shadow-sm">❤️ いいね 0</button>
            <button onclick="this.innerHTML='🔥 おしゃれ！ 1'" class="flex-shrink-0 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 px-2.5 py-1 rounded-full text-[9px] font-bold border border-orange-200 dark:border-orange-800 active:scale-95 transition-transform shadow-sm">🔥 おしゃれ！ 0</button>
            <button onclick="this.innerHTML='🙌 参考になる！ 1'" class="flex-shrink-0 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full text-[9px] font-bold border border-green-200 dark:border-green-800 active:scale-95 transition-transform shadow-sm">🙌 参考になる！ 0</button>
        </div>`;
    trendGrid.insertBefore(card, addCard);
}

// ===== コミュニティ: フィルタートグル =====
function toggleCommunityFilter(btn, group) {
    if(navigator.vibrate) navigator.vibrate([8]);
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
    if(navigator.vibrate) navigator.vibrate([10,5,15]);
    const card = btn.closest('.bg-white\\/80, .bg-white\\/60') || btn.closest('[class*="bg-white"]');
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
    if(navigator.vibrate) navigator.vibrate([8]);
    const reacted = btn.dataset.reacted === '1';
    btn.dataset.reacted = reacted ? '0' : '1';
    const parts = btn.textContent.trim().split(' ');
    const emoji = parts[0];
    const label = parts.slice(1, -1).join(' ');
    const count = reacted ? baseCount : baseCount + 1;
    const displayCount = count >= 1000 ? (count/1000).toFixed(1) + 'k' : count;
    btn.textContent = `${emoji} ${label} ${displayCount}`;
    btn.style.fontWeight = reacted ? '' : '900';
    btn.style.transform = reacted ? '' : 'scale(1.05)';
    setTimeout(() => { btn.style.transform = ''; }, 200);
}

// コミュニティ投稿をクローゼットにコピー
function copyToCloset(btn, imgSrc, name) {
    if(btn.dataset.saved === '1') {
        alert('このコーデはすでにクローゼットに保存済みです');
        return;
    }
    if(navigator.vibrate) navigator.vibrate([10, 5, 20]);
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
