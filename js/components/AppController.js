// js/components/AppController.js
class AppController {
    static init() {
        this.overlay = document.getElementById('transition-overlay');
        ClosetModule.init();
        ClosetComponent.init();
        DiscoveryModule.init(this);
        TrendModule.init(this);

        setTimeout(() => {
            this.changeMode('discover', false);
        }, 100);
    }

    static changeMode(mode, animate = true) {
        if (this.currentMode === mode && animate) return;
        this.currentMode = mode;
        if (navigator.vibrate) navigator.vibrate([15]);
        if (animate && this.overlay) {
            let color = 'rgba(15,23,42,0.95)';
            if (mode === 'preppy') color = 'rgba(37, 99, 235, 0.95)';
            if (mode === 'minimalist') color = 'rgba(168, 85, 247, 0.95)';
            this.overlay.style.backgroundColor = color;
            this.overlay.style.opacity = '1';
            setTimeout(() => {
                DiscoveryModule.updateUI(mode);
                TrendModule.render(mode);
            }, 300);
            setTimeout(() => { this.overlay.style.opacity = '0'; }, 600);
        } else {
            DiscoveryModule.updateUI(mode);
            TrendModule.render(mode);
        }
    }
}
