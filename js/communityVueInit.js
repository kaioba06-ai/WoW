// Community タブの Vue ルートマウント。
// index.html に直書きされていたものをタブ責務に従い分離。
// 元は <script type="module"> だったため、こちらも ES module として読み込む。

import { CommunityView } from './components/CommunityView.js';

function setupVueCommunity() {
    if (window.communityApp) return;
    const mountPoint = document.getElementById('community-app');
    if (!mountPoint) {
        console.warn('[Vue] community-app mount point not found');
        return;
    }

    const app = Vue.createApp({
        components: { CommunityView },
        data() {
            return { currentTab: 'trending' };
        },
        template: `
            <KeepAlive>
                <component :is="'CommunityView'" :key="currentTab" :type="currentTab" />
            </KeepAlive>
        `
    });

    window.communityApp = app;
    const vm = app.mount('#community-app');

    window.switchCommunityTabVue = function(tab) {
        vm.currentTab = tab;
        const ACTIVE   = 'flex-1 py-3 border-b-2 border-black dark:border-white text-black dark:text-white font-black text-[10px] tracking-[0.18em] uppercase text-center transition-all';
        const INACTIVE = 'flex-1 py-3 border-b border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 font-bold text-[10px] tracking-[0.18em] uppercase text-center hover:text-black/60 dark:hover:text-white/60 transition-all';
        const tabDiscover = document.getElementById('tab-btn-discover');
        const tabTrending = document.getElementById('tab-btn-trending');
        const tabQa       = document.getElementById('tab-btn-qa');
        if (tabDiscover) tabDiscover.className = tab === 'discover' ? ACTIVE : INACTIVE;
        if (tabTrending) tabTrending.className = tab === 'trending' ? ACTIVE : INACTIVE;
        if (tabQa)       tabQa.className       = tab === 'qa' ? ACTIVE : INACTIVE;
    };

    if (typeof initCommunity === 'function') initCommunity();
    console.log('[Vue] Community app mounted successfully');
}

window.addEventListener('sectionsLoaded', () => {
    setTimeout(setupVueCommunity, 100);
});
