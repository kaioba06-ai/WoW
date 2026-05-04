// ===== シーン管理・シーン別コーデ選択 =====

// ===== シーン管理・シーン別コーデ選択 =====


function switchScene(sceneName, el) {
    currentScene = sceneName;
    // 背景画像の設定を削除 (背景画像は不要との要望に基づく)
    // document.body.style.backgroundImage = paths[sceneName];

    document.querySelectorAll('.scene-card').forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = '';
        const check = card.querySelector('.scene-check');
        if (check) check.classList.add('hidden');
    });
    el.classList.add('active');
    el.style.borderColor = '';
    const check = el.querySelector('.scene-check');
    if (check) check.classList.remove('hidden');

    const overlayMap = { beach: '0.65', room: '0.70', park: '0.70', office: '0.70', default: '0.75' };
    document.body.style.setProperty('--overlay-opacity', overlayMap[sceneName] || '0.75');

    renderSceneOutfitPreview(sceneName);

    if (sceneName !== 'default') {
        const outfits = loadSceneOutfits();
        if (!outfits[sceneName] || outfits[sceneName].length === 0) {
            setTimeout(() => openSceneOutfitModal(), 400);
        }
    }
}

function renderSceneOutfitPreview(sceneName) {
    const preview = document.getElementById('scene-outfit-preview');
    const label = document.getElementById('scene-outfit-label');
    const itemsEl = document.getElementById('scene-outfit-items');
    const emptyEl = document.getElementById('scene-outfit-empty');

    if (sceneName === 'default') {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    label.textContent = `${sceneLabels[sceneName]} のコーデ`;

    const outfits = loadSceneOutfits();
    const selectedIds = outfits[sceneName] || [];
    const selectedItems = closetItems.filter(i => selectedIds.includes(i.id));

    itemsEl.innerHTML = '';
    if (selectedItems.length === 0) {
        itemsEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
    } else {
        emptyEl.classList.add('hidden');
        itemsEl.classList.remove('hidden');
        selectedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/50 dark:border-white/10 shadow-sm relative';
            div.title = item.name;
            if (item.img) {
                div.innerHTML = `<img src="${item.img}" class="w-full h-full object-cover"/>`;
            } else {
                div.style.background = item.color + '30';
                div.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-xl" style="color:${item.color}">${CATEGORY_ICONS[item.category] || 'checkroom'}</span></div>`;
            }
            itemsEl.appendChild(div);
        });
    }
}

// ===== シーン別コーデ選択モーダル =====
let sceneClosetFilter = 'all';
let sceneOutfitTemp = [];

function openSceneOutfitModal() {
    if (currentScene === 'default') { alert('シーンを選択してからコーデを設定してください'); return; }
    const overlay = document.getElementById('scene-outfit-overlay');
    const modal = document.getElementById('scene-outfit-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        modal.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
    });

    document.getElementById('scene-outfit-modal-title').textContent = `「${sceneLabels[currentScene]}」のコーデ`;

    const outfits = loadSceneOutfits();
    sceneOutfitTemp = [...(outfits[currentScene] || [])];

    sceneClosetFilter = 'all';
    document.querySelectorAll('.scene-closet-filter').forEach((b, i) => {
        b.className = i === 0
            ? 'scene-closet-filter flex-shrink-0 bg-primary dark:bg-blue-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95'
            : 'scene-closet-filter flex-shrink-0 bg-white/70 dark:bg-slate-800 border border-black/10 dark:border-white/10 text-on-surface-variant dark:text-white/70 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95';
    });

    renderSceneClosetGrid();
}

function closeSceneOutfitModal() {
    const overlay = document.getElementById('scene-outfit-overlay');
    const modal = document.getElementById('scene-outfit-modal');
    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }, 350);
}

function filterSceneCloset(cat, el) {
    sceneClosetFilter = cat;
    document.querySelectorAll('.scene-closet-filter').forEach(b => {
        b.className = 'scene-closet-filter flex-shrink-0 bg-white/70 dark:bg-slate-800 border border-black/10 dark:border-white/10 text-on-surface-variant dark:text-white/70 px-4 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95';
    });
    el.className = 'scene-closet-filter flex-shrink-0 bg-primary dark:bg-blue-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95';
    renderSceneClosetGrid();
}

function renderSceneClosetGrid() {
    const grid = document.getElementById('scene-closet-grid');
    const emptyEl = document.getElementById('scene-closet-empty');
    grid.innerHTML = '';

    const filtered = sceneClosetFilter === 'all'
        ? closetItems
        : closetItems.filter(i => i.category === sceneClosetFilter);

    if (filtered.length === 0) {
        emptyEl.classList.remove('hidden');
        grid.classList.add('hidden');
    } else {
        emptyEl.classList.add('hidden');
        grid.classList.remove('hidden');
    }

    filtered.forEach(item => {
        const isSelected = sceneOutfitTemp.includes(item.id);
        const card = document.createElement('div');
        card.className = `relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all active:scale-95 ${isSelected ? 'border-primary dark:border-blue-400 shadow-lg shadow-primary/20' : 'border-transparent'}`;
        card.style.aspectRatio = '1';
        card.innerHTML = `
            ${item.img
                ? `<img src="${item.img}" class="w-full h-full object-cover"/>`
                : `<div class="w-full h-full flex flex-col items-center justify-center gap-1" style="background:${item.color}25">
                        <span class="material-symbols-outlined text-2xl" style="color:${item.color}">${CATEGORY_ICONS[item.category] || 'checkroom'}</span>
                    </div>`
            }
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <p class="text-white text-[9px] font-bold leading-tight truncate">${item.name}</p>
            </div>
            ${isSelected ? `<div class="absolute top-1.5 right-1.5 w-5 h-5 bg-primary dark:bg-blue-500 rounded-full flex items-center justify-center shadow-md"><span class="material-symbols-outlined text-white text-[12px]" style="font-variation-settings:'FILL' 1">check</span></div>` : ''}
        `;
        card.onclick = () => toggleSceneOutfitItem(item.id);
        grid.appendChild(card);
    });

    updateSceneSelectedCount();
}

function toggleSceneOutfitItem(id) {
    if (navigator.vibrate) navigator.vibrate([8]);
    const idx = sceneOutfitTemp.indexOf(id);
    if (idx >= 0) {
        sceneOutfitTemp.splice(idx, 1);
    } else {
        sceneOutfitTemp.push(id);
    }
    renderSceneClosetGrid();
}

function updateSceneSelectedCount() {
    document.getElementById('scene-selected-count').textContent = sceneOutfitTemp.length;
}

function clearSceneOutfit() {
    sceneOutfitTemp = [];
    renderSceneClosetGrid();
}

function saveSceneOutfitSelection() {
    const outfits = loadSceneOutfits();
    outfits[currentScene] = [...sceneOutfitTemp];
    saveSceneOutfits(outfits);
    closeSceneOutfitModal();
    setTimeout(() => {
        renderSceneOutfitPreview(currentScene);
        alert(`「${sceneLabels[currentScene]}」のコーデを保存しました！`);
    }, 400);
}
