// ===== UI・タブ切り替え・スワイプ・ダークモード・初期化 =====

// 14. 戻るボタンキャッチ
window.addEventListener('popstate', (e) => {
    if(e.state && e.state.tab) switchTabReal(e.state.tab, null, true);
});

function switchTab(tabId, el) {
    if(navigator.vibrate) navigator.vibrate([10]);
    switchTabReal(tabId, el, false);
}

function switchTabReal(tabId, el, isPopState) {
    console.log(`[UI] switchTabReal called: tabId=${tabId}, isPopState=${isPopState}`);
    if(!isPopState) history.pushState({tab: tabId}, '', '#' + tabId);
    
    // 最後に開いていたタブを保存
    localStorage.setItem('kion_current_tab', tabId);

    const containerIds = ['home-container', 'weekly-container', 'closet-container', 'discover-container', 'profile-container'];
    
    // すべてのページを非表示にする
    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.classList.add('hidden-page');
            container.classList.remove('active-page');
            // CSSの!importantを確実に効かせるためインラインスタイルは除去
            container.style.display = '';
        }
    });

    // 選択されたページを表示
    const targetContainer = document.getElementById(tabId + '-container');
    if (targetContainer) {
        targetContainer.classList.remove('hidden-page');
        targetContainer.classList.add('active-page');
        targetContainer.style.display = ''; // CSSの!importantに任せる
        
        // 内部のセクションを可視化
        const section = targetContainer.querySelector('.page-section');
        if (section) {
            section.classList.remove('hidden-section');
        } else {
            // セクションがない場合（読み込み失敗時など）でも中身が見えるように
            const errorDiv = targetContainer.querySelector('div');
            if (errorDiv) errorDiv.style.display = 'block';
        }
    }

    // スクロール位置の復元
    window.scrollTo({ top: 0, behavior: 'instant' });


    // サブページが開いている場合は閉じる
    closeSubPage('social');

    // ナビゲーションバーの表示更新 (インデックスに基づく安定した方式)
    const navItems = document.querySelectorAll('.nav-item');
    const tabIndexMap = {home: 0, weekly: 1, discover: 2, closet: 3, profile: 4};
    const index = tabIndexMap[tabId];

    navItems.forEach((item, i) => {
        item.classList.remove('active-nav-item');
        const icon = item.querySelector('.material-symbols-outlined');
        if (icon) {
            if (i === index) {
                item.classList.add('active-nav-item');
                icon.style.fontVariationSettings = "'FILL' 1";
            } else {
                icon.style.fontVariationSettings = "'FILL' 0";
            }
        }
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ===== サブページ (Following/Followers) 制御 =====
function openSubPage(id) {
    if(navigator.vibrate) navigator.vibrate([10]);
    const el = document.getElementById('page-' + id);
    if (!el) return;
    
    el.classList.remove('hidden-section');
    requestAnimationFrame(() => {
        el.style.transform = 'translateX(0)';
    });
}

function closeSubPage(id) {
    const el = document.getElementById('page-' + id);
    if (!el) return;
    
    el.style.transform = 'translateX(100%)';
    setTimeout(() => {
        el.classList.add('hidden-section');
    }, 300);
}

// 5. スワイプによるタブ・ 1. プル・トゥ・リフレッシュ
let tsX = 0, tsY = 0;
const tabArr = ['home', 'weekly', 'discover', 'closet', 'profile'];
document.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; }, {passive: true});
document.addEventListener('touchend', e => {
    let teX = e.changedTouches[0].clientX;
    let teY = e.changedTouches[0].clientY;
    let diffX = tsX - teX;
    let diffY = teY - tsY;

    // 横スワイプ (5)
    if(Math.abs(diffX) > 100 && Math.abs(diffY) < 50) {
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
        setTimeout(() => { document.body.classList.remove('pulling'); alert('気象＆コーデ情報を最新化しました！'); }, 1200);
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
const DARK_MODE_KEY = 'kion_dark_mode';

function toggleDarkMode() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.classList.add('theme-ripple');
        setTimeout(() => icon.classList.remove('theme-ripple'), 500);
    }

    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');

    // localStorage に保存
    localStorage.setItem(DARK_MODE_KEY, isDark ? '1' : '0');

    // ヘッダーアイコン更新
    if (icon) {
        icon.setAttribute('data-icon', isDark ? 'light_mode' : 'dark_mode');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }

    // 設定モーダル内の表示を同期
    syncSettingsThemeUI(isDark);
}

function syncSettingsThemeUI(isDark) {
    const settingsIcon = document.getElementById('settings-theme-icon');
    const settingsLabel = document.getElementById('settings-theme-label');
    if (settingsIcon) {
        settingsIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
    if (settingsLabel) {
        settingsLabel.textContent = isDark ? 'ダークモード使用中' : 'ライトモード使用中';
    }
}

// ページロード時にダークモード復元
function restoreDarkMode() {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    // 保存された設定がない（初回）または '1' の場合はダークモード
    const isDark = (saved === null || saved === '1');

    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-icon', isDark ? 'light_mode' : 'dark_mode');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
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

// 初期化
window.addEventListener('sectionsLoaded', () => {
    console.log('[UI] sectionsLoaded event received. Starting page layout setup...');
    
    // 最後にいたページを復元 (hash > localStorage > home)
    const hash = window.location.hash.replace('#', '');
    const savedTab = localStorage.getItem('kion_current_tab');
    const tabArr = ['home', 'weekly', 'discover', 'closet', 'profile'];
    const initialTab = (tabArr.includes(hash)) ? hash : (tabArr.includes(savedTab) ? savedTab : 'home');

    console.log(`[UI] Initial tab determined: ${initialTab}`);

    // 初期タブを表示
    switchTabReal(initialTab, null, true);
    history.replaceState({tab: initialTab}, '', '#' + initialTab);

    // ダークモードを復元 & 設定UI同期
    restoreDarkMode();
    syncSettingsThemeUI(document.documentElement.classList.contains('dark'));

    // プロフィールデータを復元
    const savedProfile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    if(savedProfile.name || savedProfile.photo || savedProfile.bio) {
        applyProfileDisplay(savedProfile);
    }

    // ドラッグスクロール初期化
    initDragScroll();

    // 6 & 2. 初期ロードフェイク
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none'; // クリックを阻害しないように
            setTimeout(() => loader.style.display = 'none', 700);
        }

        // 読み込み完了後に表示を開始 (必須)
        document.body.classList.remove('loading-app');
        console.log('App hydration complete.');

        // 13. 初回チュートリアルの表示判定
        if(!localStorage.getItem('kion_tut')) {
            const tut = document.getElementById('tutorial-modal');
            if (tut) tut.style.display = 'flex';
            localStorage.setItem('kion_tut', '1');
        }
    }, 600);
});

