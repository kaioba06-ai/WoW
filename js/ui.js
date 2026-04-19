// 14. 戻るボタンキャッチ
window.addEventListener('popstate', (e) => {
    if(e.state && e.state.tab) switchTabReal(e.state.tab, null, true);
});

// アニメーション用強制リフローヘルパー
function forceReflow(el) {
    void el.offsetWidth;
}

function switchTab(tabId, el) {
    if(navigator.vibrate) navigator.vibrate([10]);
    switchTabReal(tabId, el, false);
}

function switchTabReal(tabId, el, isPopState) {
    if(!isPopState) history.pushState({tab: tabId}, '', '#' + tabId);

    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden-section');
        forceReflow(section);
    });
    document.getElementById('page-' + tabId).classList.remove('hidden-section');

    let targetEl = el;
    if(!targetEl) {
       const map = {home:0, weekly:1, closet:2, discover:3, profile:4};
       targetEl = document.querySelectorAll('.nav-item')[map[tabId]];
    }
    if(targetEl) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active-nav-item');
            item.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
        });
        targetEl.classList.add('active-nav-item');
        targetEl.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 5. スワイプによるタブ・ 1. プル・トゥ・リフレッシュ
let tsX = 0, tsY = 0;
const tabArr = ['home', 'weekly', 'closet', 'discover', 'profile'];
document.addEventListener('touchstart', e => {
    tsX = e.touches[0].clientX;
    tsY = e.touches[0].clientY;
}, {passive: true});

document.addEventListener('touchend', e => {
    let teX = e.changedTouches[0].clientX;
    let teY = e.changedTouches[0].clientY;
    let diffX = tsX - teX;
    let diffY = teY - tsY;

    // 横スワイプ (5) — ジェスチャー排他制御
    if(Math.abs(diffX) > 100 && Math.abs(diffY) < 50) {

        // ① Elastic Pull が進行中なら Tab 切り替えを実行しない
        if (window._kionElasticActive) return;

        // ② タッチ開始点がカード要素の内部ならば Tab 切り替えをスキップ
        //    ただし画面端 15% 以内から始まったスワイプは Tab 切り替え優先
        const edgeMargin = window.innerWidth * 0.15;
        const isFromEdge = tsX < edgeMargin || tsX > window.innerWidth - edgeMargin;
        if (!isFromEdge) {
            const startEl = document.elementFromPoint(tsX, tsY);
            if (startEl?.closest('[data-reactions]')) return;
        }

        // ③ スロープ判定はすでに |diffY| < 50 で担保済み
        let active = document.querySelector('.nav-item.active-nav-item');
        if(active) {
            let idx = Array.from(document.querySelectorAll('.nav-item')).indexOf(active);
            if(diffX > 0 && idx < 4) switchTab(tabArr[idx+1], document.querySelectorAll('.nav-item')[idx+1]);
            else if(diffX < 0 && idx > 0) switchTab(tabArr[idx-1], document.querySelectorAll('.nav-item')[idx-1]);
        }
    }
    // 縦引っぱり (1)
    if(window.scrollY === 0 && diffY > 120 && Math.abs(diffX) < 50) {
        if(navigator.vibrate) navigator.vibrate([20,10,20]);
        document.body.classList.add('pulling');
        setTimeout(() => { 
            document.body.classList.remove('pulling'); 
            alert('気象＆コーデ情報を最新化しました！'); 
            if (typeof initWeather === 'function') initWeather();
        }, 1200);
    }
}, {passive: true});

// 9. オフラインチェック
window.addEventListener('offline', () => document.getElementById('offline-modal').style.display='flex');
window.addEventListener('online', () => document.getElementById('offline-modal').style.display='none');

// 12. ダブルタップズーム機能
let clickTimer = 0;
document.addEventListener('click', (e) => {
    if(e.target.tagName === 'IMG' && !e.target.closest('#tutorial-modal')) {
        const now = new Date().getTime();
        if(now - clickTimer < 300) { e.target.classList.toggle('img-zoomed'); }
        clickTimer = now;
    }
});

// ダークモード
function toggleDarkMode() {
    const icon = document.getElementById('theme-icon');
    icon.classList.add('theme-ripple');
    setTimeout(() => icon.classList.remove('theme-ripple'), 500);

    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
        icon.setAttribute('data-icon', 'light_mode');
        icon.textContent = 'light_mode';
    } else {
        icon.setAttribute('data-icon', 'dark_mode');
        icon.textContent = 'dark_mode';
    }
}

// ドラッグスクロール
function initDragScroll() {
    document.querySelectorAll('.drag-scroll-container').forEach(ele => {
        let isDown = false, startX, scrollLeft;
        ele.addEventListener('mousedown', e => {
            isDown = true;
            ele.classList.add('cursor-grabbing');
            startX = e.pageX - ele.offsetLeft;
            scrollLeft = ele.scrollLeft;
        });
        ele.addEventListener('mouseleave', () => { isDown = false; ele.classList.remove('cursor-grabbing'); });
        ele.addEventListener('mouseup', () => { isDown = false; ele.classList.remove('cursor-grabbing'); });
        ele.addEventListener('mousemove', e => {
            if (!isDown) return;
            e.preventDefault();
            ele.scrollLeft = scrollLeft - (e.pageX - ele.offsetLeft - startX) * 2;
        });
    });
}

// セクション動的ロード
async function loadSections() {
    const sections = ['home', 'weekly', 'closet', 'discover', 'profile'];
    await Promise.all(sections.map(async name => {
        const res  = await fetch(`${name}.html`);
        const html = await res.text();
        const frag = document.createRange().createContextualFragment(html);
        document.getElementById(`${name}-container`).appendChild(frag);
    }));
}

// 初期化
window.onload = async () => {
    await loadSections();

    // 設定UI・クローゼット初期レンダリング
    if(typeof _syncSettingsUI === 'function') _syncSettingsUI();
    renderClosetGrid();

    document.getElementById('page-home').classList.remove('hidden-section');
    history.replaceState({tab: 'home'}, '', '#home');

    // プロフィールデータを復元
    const savedProfile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    if(savedProfile.name || savedProfile.photo || savedProfile.bio) {
        applyProfileDisplay(savedProfile);
    }

    // 今日のポイントを復元
    const savedTips = JSON.parse(localStorage.getItem('kion_tips') || '{}');
    if(savedTips.summary || savedTips.bullet1 || savedTips.bullet2) {
        applyTipDisplay(savedTips);
    }

    // ドラッグスクロール初期化
    initDragScroll();

    // 初期ロードフェイク・チュートリアル
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
        if(!localStorage.getItem('kion_tut')) {
            const tut = document.getElementById('tutorial-modal');
            if(tut) tut.style.display = 'flex';
            localStorage.setItem('kion_tut', '1');
        }
    }, 1200);
};
