// js/components/ClosetComponent.js
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
