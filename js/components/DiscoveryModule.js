// js/components/DiscoveryModule.js
class DiscoveryModule {
    static init(appController) {
        this.app = appController;
        this.container = document.getElementById('discovery-labels-container');
        if (!this.container) return;

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
                if (this.app.currentMode === l.id) this.app.changeMode('discover');
                else this.app.changeMode(l.id);
            };
            btn.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            this.container.appendChild(btn);
        });
    }

    static updateUI(mode) {
        const pBtn = document.getElementById('label-btn-preppy');
        const mBtn = document.getElementById('label-btn-minimalist');
        if (!pBtn || !mBtn) return;

        pBtn.className = mode === 'preppy'
            ? 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all shadow-[0_4px_25px_rgba(37,99,235,0.7)] bg-blue-600 text-white border-blue-400'
            : 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all bg-black/50 text-white/60 border-white/20 backdrop-blur-md active:scale-95';

        mBtn.className = mode === 'minimalist'
            ? 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all shadow-[0_4px_25px_rgba(168,85,247,0.7)] bg-purple-600 text-white border-purple-400'
            : 'flex-1 py-3 rounded-2xl border flex flex-col justify-center items-center transition-all bg-black/50 text-white/60 border-white/20 backdrop-blur-md active:scale-95';
    }
}
