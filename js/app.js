// ===== 共有データ・定数・ユーティリティ =====

// シーンパス設定
const paths = {
    default: 'none',
    office: 'url("assets/backgrounds/office.png")',
    park:   'url("assets/backgrounds/park.png")',
    beach:  'url("assets/backgrounds/beach.jpg")',
    room:   'url("assets/backgrounds/room.jpg")',
};

const sceneLabels = {
    default: 'Standard',
    office:  'オフィス街',
    park:    '公園',
    beach:   '海辺の観光地',
    room:    '白い部屋',
};

let currentScene = 'default';

// シーン別コーデ保存: { sceneName: [itemId, ...] }
const SCENE_OUTFIT_KEY = 'kion_scene_outfits';
function loadSceneOutfits() {
    try { return JSON.parse(localStorage.getItem(SCENE_OUTFIT_KEY)) || {}; } catch(e) { return {}; }
}
function saveSceneOutfits(obj) {
    localStorage.setItem(SCENE_OUTFIT_KEY, JSON.stringify(obj));
}

// クローゼット共有データ
const CLOSET_KEY = 'kion_closet_items';
let closetItems = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
let closetSelectedCategory = '';
let closetSelectedColor = '';
let closetSelectedColorName = '';
let currentFilter = 'all';
let editingItemId = null;

const CATEGORY_LABELS = { tops:'トップス', bottoms:'ボトムス', outer:'アウター', shoes:'シューズ', bag:'バッグ', other:'その他' };
const CATEGORY_ICONS  = { tops:'apparel', bottoms:'accessibility_new', outer:'dry_cleaning', shoes:'steps', bag:'shopping_bag', other:'more_horiz' };

// 4. トースト通知UI (Overriding alert globally for elegance)
window.originalAlert = window.alert;
window.alert = function(msg) {
    if(navigator.vibrate) navigator.vibrate([15]);
    const t = document.createElement('div');
    t.className = `toast-notif fixed bottom-32 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-full shadow-2xl z-[100] text-[12px] font-bold flex items-center gap-2 whitespace-nowrap border border-white/10`;
    t.innerHTML = `<span class="material-symbols-outlined text-[16px]">info</span> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

// 15. エラーシェイク
function shakeElement(el) {
    el.classList.add('shake-err');
    setTimeout(()=> el.classList.remove('shake-err'), 600);
}

// 曜日ラベル
const DAY_NAMES = ['日','月','火','水','木','金','土'];

// ===== アプリケーション初期化 (Initialization) =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOMContentLoaded fired. Reverting to modular architecture...');
    loadSections();
});

/**
 * 外部HTMLファイルをフェッチして各コンテナに流し込む
 */
async function loadSections() {
    const sections = [
        { id: 'home-container', url: 'home.html' },
        { id: 'weekly-container', url: 'weekly.html' },
        { id: 'closet-container', url: 'closet.html' },
        { id: 'discover-container', url: 'discover.html' },
        { id: 'profile-container', url: 'profile.html' },
        { id: 'subpage-container', url: 'following.html' },
        { id: 'modals-container', url: 'modals.html' }
    ];

    console.log('[App] Loading sections...');

    try {
        await Promise.all(sections.map(async (section) => {
            const container = document.getElementById(section.id);
            if (!container) return;

            try {
                const response = await fetch(section.url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const html = await response.text();
                container.innerHTML = html;
                console.log(`[App] Loaded: ${section.url}`);
            } catch (err) {
                console.error(`[App] Failed to load ${section.url}:`, err);
                container.innerHTML = `<div class="p-10 text-center text-red-500 font-bold">Error loading ${section.url}</div>`;
            }
        }));

        console.log('[App] All sections loaded. Dispatching sectionsLoaded event...');
        window.dispatchEvent(new Event('sectionsLoaded'));
        
    } catch (globalErr) {
        console.error('[App] Critical error during section loading:', globalErr);
    }

    console.log('[App] Initialization process triggered.');
}
