// js/components/PostcardComponent.js
class PostcardComponent {
    constructor(data, mode) {
        this.data = Object.assign({}, data);
        this.mode = mode;
        this.el = document.createElement('div');
        this.el._postcardComponent = this;
        this.el.dataset.postId = this.data.id;
        this.el.dataset.genre = this.data.genre;
        this.el.dataset.mode = this.data.mode;
        this.el.dataset.hashtags = (this.data.hashtags || []).join(',');
        this.isTrendingUp = (this.data.prevRank - this.data.currentRank) >= 3;
        this.buildLayout();
        this.bindEvents();
    }

    formatCount(value) {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return `${value}`;
    }

    buildLayout() {
        const scaleBoost = this.isTrendingUp ? 1.15 : 1;
        this.el.className = 'postcard-wrapper bg-transparent relative card-enter transition-all';
        this.el.style.transform = `scale(${scaleBoost})`;

        const fw = ['０','１','２','３','４','５','６','７','８','９'];
        const rankText = '＃' + String(this.data.currentRank).split('').map(d => fw[parseInt(d)] || d).join('');
        const rankClass = this.data.currentRank <= 3 ? `rank-${this.data.currentRank}` : '';

        const UPBadge = this.isTrendingUp
            ? `<span class="bg-gradient-to-r from-rose-500 to-orange-400 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm"><span class="material-symbols-outlined text-[9px]">trending_up</span>+${this.data.prevRank - this.data.currentRank}</span>`
            : '';
        const hashtagHtml = (this.data.hashtags || []).map(tag => `<span class="text-[8px] font-bold uppercase text-white/75 bg-white/8 px-2 py-0.5 rounded-full border border-white/10">#${tag}</span>`).join(' ');
        const hotBadge = this.data.hot ? `<span class="absolute left-3 top-3 bg-red-500/85 text-white text-[8px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm z-10">急上昇</span>` : '';
        const likesDisplay = this.data.likes >= 1000 ? `${(this.data.likes / 1000).toFixed(1)}K` : this.data.likes;

        this.el.innerHTML = `
            <div class="flip-card-container">
                <div class="flip-card">
                    <div class="flip-card-face flip-card-front" style="background:transparent;">
                        <!-- メインイメージ -->
                        <div class="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/5 shadow-xl">
                            <img src="${this.data.img}" class="w-full h-full object-cover">
                            <div class="absolute inset-0" style="background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.92) 85%);"></div>

                            ${hotBadge}

                            <div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                                <span class="trend-rank-badge ${rankClass}" style="font-size:1.1rem;">${rankText}</span>
                                ${UPBadge}
                            </div>

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
                                    </div>
                                </div>
                            </div>
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
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <p class="text-sm font-black text-white mt-1" style="font-family:'Zen Kaku Gothic New','Noto Sans JP',sans-serif;">${this.data.name}</p>
                            </div>
                            <button class="flip-toggle-btn border border-white/15 bg-white/8 text-white/80 px-3 py-1.5 rounded-full text-[9px] font-bold active:scale-95 transition-all tracking-wider">← FRONT</button>
                        </div>
                        <div class="flip-card-cta mt-3">
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
                backSaveBtn.textContent = 'SAVED';
                backSaveBtn.disabled = true;
            });
        }

        this.el.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.toggleFlip();
            }
        });

        this.el.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
    }

    toggleFlip() {
        const card = this.el.querySelector('.flip-card');
        if (!card) return;
        card.classList.toggle('flipped');
    }

    handleAdapt() {
        ClosetComponent.addSavedItem({ img: this.data.img, label: this.data.name || `@${this.data.user}`, tags: this.data.hashtags, memo: 'ADAPT で保存' });
        const adaptBtn = this.el.querySelector('.adapt-btn');
        if (adaptBtn) {
            adaptBtn.textContent = 'SAVED';
            adaptBtn.disabled = true;
        }
    }
}
