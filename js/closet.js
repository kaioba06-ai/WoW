// ===== クローゼット管理 =====

// クイック追加アイテム定義
const QUICK_ADD_ITEMS = [
    { section: 'トップス', icon: 'apparel', items: [
        { name: 'Tシャツ（白）',     category: 'tops', color: '#f8f8f8', colorName: 'ホワイト' },
        { name: 'Tシャツ（黒）',     category: 'tops', color: '#111111', colorName: 'ブラック' },
        { name: 'パーカー',          category: 'tops', color: '#6b7280', colorName: 'グレー' },
        { name: 'スウェット',        category: 'tops', color: '#6b7280', colorName: 'グレー' },
        { name: 'ニット',            category: 'tops', color: '#92400e', colorName: 'ブラウン' },
        { name: 'タートルネック',    category: 'tops', color: '#111111', colorName: 'ブラック' },
        { name: 'シャツ（白）',      category: 'tops', color: '#f8f8f8', colorName: 'ホワイト' },
        { name: 'ネルシャツ',        category: 'tops', color: '#dc2626', colorName: 'レッド' },
        { name: 'ポロシャツ',        category: 'tops', color: '#0ea5e9', colorName: 'ブルー' },
        { name: 'ボーダーTシャツ',   category: 'tops', color: '#1e3a8a', colorName: 'ネイビー' },
    ]},
    { section: 'ボトムス', icon: 'accessibility_new', items: [
        { name: 'デニム（青）',      category: 'bottoms', color: '#1e3a8a', colorName: 'ネイビー' },
        { name: 'デニム（黒）',      category: 'bottoms', color: '#111111', colorName: 'ブラック' },
        { name: 'チノパン',          category: 'bottoms', color: '#e8d5b7', colorName: 'ベージュ' },
        { name: 'スラックス（黒）',  category: 'bottoms', color: '#111111', colorName: 'ブラック' },
        { name: 'スラックス（グレー）', category: 'bottoms', color: '#6b7280', colorName: 'グレー' },
        { name: 'ワイドパンツ',      category: 'bottoms', color: '#6b7280', colorName: 'グレー' },
        { name: 'スカート（白）',    category: 'bottoms', color: '#f8f8f8', colorName: 'ホワイト' },
        { name: 'スカート（黒）',    category: 'bottoms', color: '#111111', colorName: 'ブラック' },
        { name: 'プリーツスカート',  category: 'bottoms', color: '#fda4af', colorName: 'ピンク' },
        { name: 'ショートパンツ',    category: 'bottoms', color: '#92400e', colorName: 'ブラウン' },
    ]},
    { section: 'アウター', icon: 'dry_cleaning', items: [
        { name: 'ダウンジャケット',  category: 'outer', color: '#111111', colorName: 'ブラック' },
        { name: 'トレンチコート',    category: 'outer', color: '#e8d5b7', colorName: 'ベージュ' },
        { name: 'チェスターコート',  category: 'outer', color: '#6b7280', colorName: 'グレー' },
        { name: 'ウールコート',      category: 'outer', color: '#111111', colorName: 'ブラック' },
        { name: 'MA-1',             category: 'outer', color: '#16a34a', colorName: 'グリーン' },
        { name: 'デニムジャケット',  category: 'outer', color: '#1e3a8a', colorName: 'ネイビー' },
        { name: 'テーラードジャケット', category: 'outer', color: '#111111', colorName: 'ブラック' },
        { name: 'マウンテンパーカー', category: 'outer', color: '#16a34a', colorName: 'グリーン' },
    ]},
    { section: 'シューズ', icon: 'steps', items: [
        { name: 'スニーカー（白）',  category: 'shoes', color: '#f8f8f8', colorName: 'ホワイト' },
        { name: 'スニーカー（黒）',  category: 'shoes', color: '#111111', colorName: 'ブラック' },
        { name: 'ローファー',        category: 'shoes', color: '#92400e', colorName: 'ブラウン' },
        { name: 'レザーシューズ',    category: 'shoes', color: '#111111', colorName: 'ブラック' },
        { name: 'ブーツ',            category: 'shoes', color: '#92400e', colorName: 'ブラウン' },
        { name: 'サンダル',          category: 'shoes', color: '#e8d5b7', colorName: 'ベージュ' },
    ]},
    { section: 'バッグ', icon: 'shopping_bag', items: [
        { name: 'トートバッグ',      category: 'bag', color: '#e8d5b7', colorName: 'ベージュ' },
        { name: 'リュック',          category: 'bag', color: '#111111', colorName: 'ブラック' },
        { name: 'ショルダーバッグ',  category: 'bag', color: '#92400e', colorName: 'ブラウン' },
        { name: 'クラッチバッグ',    category: 'bag', color: '#111111', colorName: 'ブラック' },
    ]},
];

function renderQuickAddGrid() {
    const grid = document.getElementById('quick-add-grid');
    grid.innerHTML = '';
    QUICK_ADD_ITEMS.forEach(section => {
        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 mb-2';
        header.innerHTML = `
            <span class="material-symbols-outlined text-primary dark:text-blue-400 text-[18px]">${section.icon}</span>
            <span class="text-[11px] font-bold text-on-surface dark:text-white">${section.section}</span>
            <span class="h-[1px] flex-grow bg-black/5 dark:bg-white/10"></span>`;
        grid.appendChild(header);

        const wrap = document.createElement('div');
        wrap.className = 'flex flex-wrap gap-2 mb-1';
        section.items.forEach(item => {
            const alreadyAdded = closetItems.some(c => c.name === item.name);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.name = item.name;
            btn.className = `quick-add-btn flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
                alreadyAdded
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-on-surface dark:text-white hover:border-primary/50 hover:bg-primary/5'
            }`;
            btn.innerHTML = `
                <span class="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style="background:${item.color}"></span>
                ${item.name}
                ${alreadyAdded
                    ? '<span class="material-symbols-outlined text-[12px]" style="font-variation-settings:\'FILL\' 1">check_circle</span>'
                    : '<span class="material-symbols-outlined text-[12px]">add</span>'}
            `;
            if (!alreadyAdded) {
                btn.onclick = () => quickAddClosetItem(item, btn);
            }
            wrap.appendChild(btn);
        });
        grid.appendChild(wrap);
    });
}

function quickAddClosetItem(item, btn) {
    if(navigator.vibrate) navigator.vibrate([10, 5, 20]);
    const newItem = {
        id: Date.now(),
        name: item.name,
        category: item.category,
        color: item.color,
        colorName: item.colorName,
        memo: '',
        img: '',
        addedAt: new Date().toLocaleDateString('ja-JP')
    };
    closetItems.unshift(newItem);
    saveCloset();
    renderClosetGrid();

    btn.className = 'quick-add-btn flex items-center gap-1.5 px-3 py-2 rounded-full border text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400';
    btn.innerHTML = `
        <span class="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style="background:${item.color}"></span>
        ${item.name}
        <span class="material-symbols-outlined text-[12px]" style="font-variation-settings:'FILL' 1">check_circle</span>`;
    btn.onclick = null;

    alert(`「${item.name}」を追加しました！`);
}

function switchClosetTab(tab) {
    const isQuick = tab === 'quick';
    document.getElementById('closet-tab-quick-content').classList.toggle('hidden', !isQuick);
    document.getElementById('closet-tab-custom-content').classList.toggle('hidden', isQuick);

    const activeClass = 'flex-1 py-2 rounded-full bg-primary dark:bg-blue-500 text-white text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1';
    const inactiveClass = 'flex-1 py-2 rounded-full text-on-surface-variant dark:text-white/60 text-[11px] font-bold transition-all flex items-center justify-center gap-1';
    document.getElementById('closet-tab-quick').className = isQuick ? activeClass : inactiveClass;
    document.getElementById('closet-tab-custom').className = isQuick ? inactiveClass : activeClass;

    if (isQuick) renderQuickAddGrid();
}

function openClosetModal() {
    if(navigator.vibrate) navigator.vibrate([10]);
    editingItemId = null;
    document.getElementById('closet-modal-title').textContent = '服を追加';
    document.getElementById('closet-submit-icon').textContent = 'checkroom';
    document.getElementById('closet-submit-label').textContent = 'クローゼットに追加する';
    document.querySelector('.flex.bg-gray-100.dark\\:bg-slate-800.mx-5.rounded-full').style.display = '';

    const overlay = document.getElementById('closet-modal-overlay');
    const modal = document.getElementById('closet-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.classList.add('sheet-open');
        modal.classList.remove('sheet-close');
    });
    document.body.style.overflow = 'hidden';
    switchClosetTab('quick');
    closetSelectedCategory = '';
    closetSelectedColor = '';
    closetSelectedColorName = '';
    document.getElementById('closet-name').value = '';
    document.getElementById('closet-memo').value = '';
    document.querySelectorAll('.closet-cat-btn').forEach(b => b.classList.remove('selected-cat'));
    document.querySelectorAll('.closet-color-btn').forEach(b => b.classList.remove('selected-color'));
    removeClosetPhoto();
}

function openEditClosetModal(id) {
    const item = closetItems.find(i => i.id === id);
    if (!item) return;
    if(navigator.vibrate) navigator.vibrate([10]);

    editingItemId = id;
    document.getElementById('closet-modal-title').textContent = '服を編集';
    document.getElementById('closet-submit-icon').textContent = 'save';
    document.getElementById('closet-submit-label').textContent = '変更を保存する';
    document.querySelector('.flex.bg-gray-100.dark\\:bg-slate-800.mx-5.rounded-full').style.display = 'none';

    const overlay = document.getElementById('closet-modal-overlay');
    const modal = document.getElementById('closet-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.classList.add('sheet-open');
        modal.classList.remove('sheet-close');
    });
    document.body.style.overflow = 'hidden';

    switchClosetTab('custom');

    document.getElementById('closet-name').value = item.name;
    document.getElementById('closet-memo').value = item.memo || '';

    closetSelectedCategory = item.category;
    document.querySelectorAll('.closet-cat-btn').forEach(b => b.classList.remove('selected-cat'));
    document.querySelectorAll('.closet-cat-btn').forEach(b => {
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${item.category}'`)) {
            b.classList.add('selected-cat');
        }
    });

    closetSelectedColor = item.color;
    closetSelectedColorName = item.colorName || '';
    document.querySelectorAll('.closet-color-btn').forEach(b => b.classList.remove('selected-color'));
    document.querySelectorAll('.closet-color-btn').forEach(b => {
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${item.colorName}'`)) {
            b.classList.add('selected-color');
        }
    });

    removeClosetPhoto();
    if (item.img && item.img !== '[photo]') {
        document.getElementById('closet-preview-img').src = item.img;
        document.getElementById('closet-photo-area').classList.add('hidden');
        document.getElementById('closet-photo-preview').classList.remove('hidden');
    }
}

function closeClosetModal() {
    editingItemId = null;
    const overlay = document.getElementById('closet-modal-overlay');
    const modal = document.getElementById('closet-modal');
    overlay.style.opacity = '0';
    modal.classList.add('sheet-close');
    modal.classList.remove('sheet-open');
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

function handleClosetPhoto(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('closet-preview-img').src = e.target.result;
        document.getElementById('closet-photo-area').classList.add('hidden');
        document.getElementById('closet-photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeClosetPhoto() {
    document.getElementById('closet-photo-input').value = '';
    const img = document.getElementById('closet-preview-img');
    if(img) img.src = '';
    const preview = document.getElementById('closet-photo-preview');
    const area = document.getElementById('closet-photo-area');
    if(preview) preview.classList.add('hidden');
    if(area) area.classList.remove('hidden');
}

function selectClosetCategory(el, cat) {
    document.querySelectorAll('.closet-cat-btn').forEach(b => b.classList.remove('selected-cat'));
    el.classList.add('selected-cat');
    closetSelectedCategory = cat;
}

function selectClosetColor(el, color, name) {
    document.querySelectorAll('.closet-color-btn').forEach(b => b.classList.remove('selected-color'));
    el.classList.add('selected-color');
    closetSelectedColor = color;
    closetSelectedColorName = name;
}

function submitClosetItem() {
    const name = document.getElementById('closet-name').value.trim();
    if(!name) { shakeElement(document.getElementById('closet-name')); return; }
    if(!closetSelectedCategory) {
        alert('カテゴリを選択してください');
        return;
    }
    const imgSrc = document.getElementById('closet-preview-img').src || '';
    const memo = document.getElementById('closet-memo').value.trim();
    const imgVal = imgSrc && imgSrc !== window.location.href ? imgSrc : '';

    if (editingItemId !== null) {
        const idx = closetItems.findIndex(i => i.id === editingItemId);
        if (idx >= 0) {
            closetItems[idx] = {
                ...closetItems[idx],
                name,
                category: closetSelectedCategory,
                color: closetSelectedColor || closetItems[idx].color,
                colorName: closetSelectedColorName || closetItems[idx].colorName,
                memo,
                img: imgVal || closetItems[idx].img,
            };
        }
        editingItemId = null;
        saveCloset();
        renderClosetGrid();
        closeClosetModal();
        setTimeout(() => {
            if(navigator.vibrate) navigator.vibrate([10,5,20]);
            alert(`「${name}」を更新しました！`);
        }, 350);
    } else {
        const item = {
            id: Date.now(),
            name,
            category: closetSelectedCategory,
            color: closetSelectedColor || '#888',
            colorName: closetSelectedColorName || '',
            memo,
            img: imgVal,
            addedAt: new Date().toLocaleDateString('ja-JP')
        };
        closetItems.unshift(item);
        saveCloset();
        renderClosetGrid();
        closeClosetModal();
        setTimeout(() => {
            if(navigator.vibrate) navigator.vibrate([10,5,20]);
            alert(`「${name}」をクローゼットに追加しました！✨`);
        }, 350);
    }
}

function saveCloset() {
    try {
        localStorage.setItem(CLOSET_KEY, JSON.stringify(closetItems));
    } catch(e) {
        const lite = closetItems.map(i => ({...i, img: i.img ? '[photo]' : ''}));
        localStorage.setItem(CLOSET_KEY, JSON.stringify(lite));
    }
    
    // クラウド自動同期を実行
    if (typeof sendToCloud === 'function') {
        sendToCloud(true);
    }
}

let pendingDeleteId = null;

function deleteClosetItem(id) {
    const item = closetItems.find(i => i.id === id);
    if (!item) return;
    pendingDeleteId = id;
    document.getElementById('delete-confirm-name').textContent = `「${item.name}」を削除します`;
    document.getElementById('delete-confirm-overlay').classList.remove('hidden');
    if(navigator.vibrate) navigator.vibrate([10]);
}

function confirmDeleteCloset() {
    if (pendingDeleteId === null) return;
    closetItems = closetItems.filter(i => i.id !== pendingDeleteId);
    pendingDeleteId = null;
    saveCloset();
    renderClosetGrid();
    document.getElementById('delete-confirm-overlay').classList.add('hidden');
}

function cancelDeleteCloset() {
    pendingDeleteId = null;
    document.getElementById('delete-confirm-overlay').classList.add('hidden');
}

function renderClosetGrid(filter) {
    if(filter !== undefined) currentFilter = filter;
    const grid = document.getElementById('closet-grid');
    Array.from(grid.children).forEach(child => {
        if(child.id !== 'closet-add-card') child.remove();
    });
    const addCard = document.getElementById('closet-add-card');

    const filtered = currentFilter === 'all' ? closetItems : closetItems.filter(i => i.category === currentFilter);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'closet-item-card bg-white/60 dark:bg-slate-800/60 backdrop-blur-md aspect-square rounded-[28px] border border-white/50 dark:border-white/10 shadow-sm overflow-hidden relative group flex flex-col';
        card.dataset.category = item.category;
        card.innerHTML = `
            ${item.img
                ? `<img src="${item.img}" class="w-full h-3/4 object-cover"/>`
                : `<div class="w-full h-3/4 flex flex-col items-center justify-center gap-1" style="background:${item.color}20">
                        <div class="w-10 h-10 rounded-full shadow-inner" style="background:${item.color}"></div>
                        <span class="material-symbols-outlined text-2xl" style="color:${item.color}">${CATEGORY_ICONS[item.category] || 'checkroom'}</span>
                    </div>`
            }
            <div class="flex-1 px-3 py-2 flex flex-col justify-center">
                <p class="font-bold text-[10px] dark:text-white leading-snug truncate">${item.name}</p>
                <p class="text-[8px] text-on-surface-variant dark:text-white/50 mt-0.5">${CATEGORY_LABELS[item.category] || item.category}${item.colorName ? ' • ' + item.colorName : ''}</p>
            </div>
            <div class="absolute top-2 right-2 hidden group-hover:flex group-focus-within:flex flex-col gap-1">
                <button onclick="openEditClosetModal(${item.id})" class="bg-primary/80 text-white w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all shadow">
                    <span class="material-symbols-outlined text-[12px]">edit</span>
                </button>
                <button onclick="deleteClosetItem(${item.id})" class="bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all shadow">
                    <span class="material-symbols-outlined text-[12px]">close</span>
                </button>
            </div>`;
        grid.insertBefore(card, addCard);
    });

    document.getElementById('closet-count').textContent = `${closetItems.length} アイテム`;
}

function filterCloset(cat, el) {
    if(navigator.vibrate) navigator.vibrate([8]);
    document.querySelectorAll('.closet-filter-btn').forEach(b => b.classList.remove('active-filter'));
    el.classList.add('active-filter');
    renderClosetGrid(cat);
}

// 初期レンダリング
window.addEventListener('sectionsLoaded', () => {
    renderClosetGrid();
});
