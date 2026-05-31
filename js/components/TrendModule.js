// js/components/TrendModule.js
class TrendModule {
    static init(appController) {
        this.app = appController;
        this.container = document.getElementById('trend-view-container');
    }

    static render(mode) {
        if (!this.container) return;
        this.container.innerHTML = '';
        let filteredData = USER_POSTS.filter(post => mode === 'discover' ? true : post.mode === mode);

        if (mode === 'preppy') {
            filteredData.sort((a, b) => (b.hot === a.hot ? b.likes - a.likes : (b.hot ? 1 : -1)));
            this.container.className = 'grid grid-cols-1 gap-4 pb-4 mt-4';
        } else if (mode === 'minimalist') {
            filteredData.sort((a, b) => (b.hot === a.hot ? b.likes - a.likes : (b.hot ? 1 : -1)));
            this.container.className = 'grid grid-cols-2 gap-3 pb-4 mt-4';
        } else {
            filteredData.sort((a, b) => b.likes - a.likes);
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
