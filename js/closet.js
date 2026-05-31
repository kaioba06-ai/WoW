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
    if (typeof sendToCloud === 'function') {
        sendToCloud(true);
    }
    // スペクトルは常時表示なので常に再描画、詳細が開いていれば全体を更新
    renderColorSpectrum();
    const analysisContent = document.getElementById('color-analysis-content');
    if (analysisContent && !analysisContent.classList.contains('hidden')) {
        renderColorAnalysis();
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

function filterCloset(cat) {
    if (navigator.vibrate) navigator.vibrate([8]);
    applyGenreFilter(cat);
}

// 初期レンダリング
window.addEventListener('sectionsLoaded', () => {
    renderClosetGrid();
    renderColorSpectrum();
});

// ===== クローゼット色分析 =====

const COLOR_META = {
    'ブラック': { hex: '#1A1A1A', warmth: 50, saturation:  0, group: 'neutral' },
    'ホワイト': { hex: '#F5F5F5', warmth: 50, saturation:  0, group: 'neutral' },
    'グレー':   { hex: '#707070', warmth: 50, saturation:  5, group: 'neutral' },
    'ベージュ': { hex: '#E8D5B7', warmth: 65, saturation: 20, group: 'neutral' },
    'ブラウン': { hex: '#92400E', warmth: 70, saturation: 55, group: 'neutral' },
    'ネイビー': { hex: '#1E3A8A', warmth: 20, saturation: 70, group: 'cool'    },
    'ブルー':   { hex: '#0EA5E9', warmth: 25, saturation: 85, group: 'cool'    },
    'グリーン': { hex: '#16A34A', warmth: 35, saturation: 75, group: 'cool'    },
    'パープル': { hex: '#7C3AED', warmth: 30, saturation: 80, group: 'cool'    },
    'レッド':   { hex: '#DC2626', warmth: 85, saturation: 90, group: 'warm'    },
    'ピンク':   { hex: '#FDA4AF', warmth: 75, saturation: 50, group: 'warm'    },
    'イエロー': { hex: '#F59E0B', warmth: 90, saturation: 85, group: 'warm'    },
    'オレンジ': { hex: '#EA580C', warmth: 85, saturation: 90, group: 'warm'    },
    'カーキ':   { hex: '#7A7A3F', warmth: 60, saturation: 40, group: 'warm'    },
    'オリーブ': { hex: '#6B8040', warmth: 55, saturation: 35, group: 'warm'    },
};

const NEUTRAL_IDS = ['ブラック', 'ホワイト', 'グレー', 'ベージュ', 'ブラウン'];
const EARTH_IDS   = ['ベージュ', 'ブラウン', 'カーキ', 'オリーブ'];

const DNA_TYPES = [
    {
        label: 'モノトーン\nシフト',
        desc: '洗練と潔さの使い手。シンプルを極めるスタイル。',
        test: (r) => sumRatio(r, NEUTRAL_IDS) >= 0.70,
    },
    {
        label: 'アース\nカラー',
        desc: '自然体ナチュラリスト。大地の色を纏う安定感。',
        test: (r) => sumRatio(r, EARTH_IDS) >= 0.40,
    },
    {
        label: 'ネイビー\n集中型',
        desc: 'クラシックコンサバ。品格と信頼感のプロフェッショナル。',
        test: (r) => (r['ネイビー'] || 0) >= 0.30,
    },
    {
        label: 'カラフル\nミックス',
        desc: '気分で着こなすフリースタイラー。色が武器。',
        test: (r) => Object.values(r).filter(v => v >= 0.08).length >= 5,
    },
    {
        label: 'クールトーン派',
        desc: 'ブルー・グリーン系が中心。クールで都会的な感覚の持ち主。',
        test: (r) => sumRatio(r, ['ネイビー', 'ブルー', 'グリーン', 'パープル']) >= 0.45,
    },
    {
        label: 'ウォームトーン派',
        desc: '赤・黄・ピンク系が中心。情熱的で温かみあふれるスタイル。',
        test: (r) => sumRatio(r, ['レッド', 'ピンク', 'イエロー', 'オレンジ']) >= 0.35,
    },
    {
        label: 'バランス型',
        desc: 'どんな色とも相性◎。合わせやすいスタイルの達人。',
        test: () => true,
    },
];

function sumRatio(ratios, ids) {
    return ids.reduce((sum, id) => sum + (ratios[id] || 0), 0);
}

function calcColorSummary() {
    if (closetItems.length === 0) return { ratios: {}, sorted: [] };
    const counts = {};
    closetItems.forEach(item => {
        const name = item.colorName || '不明';
        counts[name] = (counts[name] || 0) + 1;
    });
    const total = closetItems.length;
    const ratios = {};
    Object.entries(counts).forEach(([name, count]) => { ratios[name] = count / total; });
    const sorted = Object.entries(ratios)
        .sort((a, b) => b[1] - a[1])
        .map(([name, ratio]) => ({ name, ratio, hex: (COLOR_META[name] || {}).hex || item_hex_fallback(name) }));
    return { ratios, sorted };
}

function item_hex_fallback(name) {
    const found = closetItems.find(i => i.colorName === name);
    return found ? found.color : '#888888';
}

const GENRE_META = {
    tops:    { label: 'トップス',  icon: 'apparel',          color: '#3B82F6' },
    bottoms: { label: 'ボトムス',  icon: 'accessibility_new', color: '#8B5CF6' },
    outer:   { label: 'アウター',  icon: 'dry_cleaning',      color: '#F59E0B' },
    shoes:   { label: 'シューズ',  icon: 'steps',             color: '#10B981' },
    bag:     { label: 'バッグ',    icon: 'shopping_bag',      color: '#F43F5E' },
    other:   { label: 'その他',    icon: 'more_horiz',        color: '#6B7280' },
};

let currentSpectrumGenre = 'all';

function calcColorSummaryFromItems(items) {
    if (items.length === 0) return { ratios: {}, sorted: [] };
    const counts = {};
    items.forEach(item => {
        const name = item.colorName || '不明';
        counts[name] = (counts[name] || 0) + 1;
    });
    const total = items.length;
    const ratios = {};
    Object.entries(counts).forEach(([name, count]) => { ratios[name] = count / total; });
    const sorted = Object.entries(ratios)
        .sort((a, b) => b[1] - a[1])
        .map(([name, ratio]) => ({ name, ratio, hex: (COLOR_META[name] || {}).hex || item_hex_fallback(name) }));
    return { ratios, sorted };
}

function applyGenreFilter(genre) {
    currentSpectrumGenre = genre;
    currentFilter = genre;

    // カテゴリフィルターボタンの同期
    document.querySelectorAll('.closet-filter-btn').forEach(b => b.classList.remove('active-filter'));
    const activeBtn = document.querySelector(`.closet-filter-btn[data-cat="${genre}"]`);
    if (activeBtn) activeBtn.classList.add('active-filter');

    renderColorSpectrum();
    renderClosetGrid();
}

function renderColorSpectrum() {
    const barEl    = document.getElementById('color-spectrum-bar');
    const legendEl = document.getElementById('color-spectrum-legend');
    const countEl  = document.getElementById('spectrum-item-count');
    if (!barEl) return;

    const filtered = currentSpectrumGenre === 'all'
        ? closetItems
        : closetItems.filter(i => i.category === currentSpectrumGenre);

    const { sorted } = calcColorSummaryFromItems(filtered);
    barEl.innerHTML   = '';
    legendEl.innerHTML = '';
    if (countEl) countEl.textContent = filtered.length > 0 ? `${filtered.length}点` : '';

    if (sorted.length === 0) {
        const msg = currentSpectrumGenre === 'all' ? '服を追加すると表示されます' : 'このジャンルのアイテムがありません';
        barEl.innerHTML = `<div class="w-full h-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center"><span class="text-[9px] text-gray-400 dark:text-white/30">${msg}</span></div>`;
        return;
    }
    sorted.forEach(({ name, ratio, hex }) => {
        const seg = document.createElement('div');
        seg.style.cssText = `width:${(ratio * 100).toFixed(1)}%;background:${hex};transition:width 0.4s ease;`;
        seg.title = `${name} ${Math.round(ratio * 100)}%`;
        barEl.appendChild(seg);
        if (ratio >= 0.05) {
            const dot = document.createElement('span');
            dot.className = 'flex items-center gap-1 text-[8px] font-bold text-on-surface dark:text-white/70';
            dot.innerHTML = `<span class="inline-block w-2 h-2 rounded-full flex-shrink-0 border border-black/10" style="background:${hex}"></span>${name}&nbsp;${Math.round(ratio * 100)}%`;
            legendEl.appendChild(dot);
        }
    });
}

function renderColorAnalysis() {
    renderColorSpectrum();

    const dnaTypeEl = document.getElementById('closet-dna-type');
    const dnaDscEl  = document.getElementById('closet-dna-desc');
    const mapEl     = document.getElementById('warmth-map');

    const { ratios } = calcColorSummaryFromItems(closetItems);

    // ── カラーDNA ──
    if (dnaTypeEl && dnaDscEl) {
        const type = DNA_TYPES.find(t => t.test(ratios)) || DNA_TYPES[DNA_TYPES.length - 1];
        dnaTypeEl.textContent = type.label;
        dnaDscEl.textContent  = type.desc;
    }

    // ── 寒暖マップ（SVG散布図）──
    if (mapEl) {
        let svg = `
            <rect width="100" height="100" rx="4" fill="currentColor" fill-opacity="0.03"/>
            <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" stroke-opacity="0.08" stroke-width="0.8"/>
            <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-opacity="0.08" stroke-width="0.8"/>
            <text x="2" y="7" font-size="4.5" fill="currentColor" fill-opacity="0.35">高彩度</text>
            <text x="2" y="98" font-size="4.5" fill="currentColor" fill-opacity="0.35">低彩度</text>`;
        closetItems.forEach(item => {
            const meta = COLOR_META[item.colorName];
            if (!meta) return;
            const hex = item.color || meta.hex;
            svg += `<circle cx="${meta.warmth}" cy="${100 - meta.saturation}" r="4.5" fill="${hex}" fill-opacity="0.85" stroke="white" stroke-width="1"/>`;
        });
        mapEl.innerHTML = svg;
    }

    // ── ジャンル分布 ──
    renderGenreDistribution();
}

function renderGenreDistribution() {
    const specBar = document.getElementById('genre-spectrum-bar');
    const listEl  = document.getElementById('genre-bar-list');
    if (!specBar || !listEl) return;

    const total = closetItems.length;
    if (total === 0) {
        specBar.innerHTML = '<div class="w-full h-full bg-gray-100 dark:bg-slate-700 rounded-lg"></div>';
        listEl.innerHTML  = '';
        return;
    }

    // カテゴリ別カウント（定義順で並べる）
    const counts = {};
    Object.keys(GENRE_META).forEach(k => { counts[k] = 0; });
    closetItems.forEach(item => {
        const key = item.category in GENRE_META ? item.category : 'other';
        counts[key]++;
    });

    // ── ジャンルスペクトルバー ──
    specBar.innerHTML = '';
    Object.entries(counts).forEach(([key, count]) => {
        if (count === 0) return;
        const seg = document.createElement('div');
        seg.style.cssText = `width:${(count / total * 100).toFixed(1)}%;background:${GENRE_META[key].color};transition:width 0.4s ease;`;
        seg.title = `${GENRE_META[key].label} ${count}点`;
        specBar.appendChild(seg);
    });

    // ── カテゴリ別横棒リスト ──
    const maxCount = Math.max(...Object.values(counts), 1);
    listEl.innerHTML = '';
    Object.entries(counts).forEach(([key, count]) => {
        if (count === 0) return;
        const meta = GENRE_META[key];
        const pct  = Math.round(count / total * 100);
        const barW = (count / maxCount * 100).toFixed(1);

        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        row.innerHTML = `
            <span class="material-symbols-outlined text-[14px] flex-shrink-0" style="color:${meta.color}">${meta.icon}</span>
            <span class="text-[9px] font-bold dark:text-white w-14 flex-shrink-0">${meta.label}</span>
            <div class="flex-1 h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" style="width:${barW}%;background:${meta.color}"></div>
            </div>
            <span class="text-[8px] font-bold text-on-surface-variant dark:text-white/50 w-10 text-right flex-shrink-0">${count}点 ${pct}%</span>`;
        listEl.appendChild(row);
    });
}

function toggleColorAnalysis() {
    const content = document.getElementById('color-analysis-content');
    const icon    = document.getElementById('color-analysis-toggle-icon');
    if (!content) return;
    const opening = content.classList.contains('hidden');
    content.classList.toggle('hidden', !opening);
    icon.textContent = opening ? 'expand_less' : 'expand_more';
    if (opening) renderColorAnalysis();
}
