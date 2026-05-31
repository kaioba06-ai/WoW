// js/components/ClosetModule.js
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
        if (!this.container) return;
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
