// ===== 共有データ・定数・ユーティリティ =====

// シーンパス設定
const paths = WOW_CONSTANTS.SCENE_PATHS;
const sceneLabels = WOW_CONSTANTS.SCENE_LABELS;

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

const CATEGORY_LABELS = WOW_CONSTANTS.CATEGORY_LABELS;
const CATEGORY_ICONS  = WOW_CONSTANTS.CATEGORY_ICONS;

// 4. トースト通知UI (Overriding alert globally for elegance)
window.alert = function(msg) {
    if (window.WowUtils && window.WowUtils.showToast) {
        window.WowUtils.showToast(msg);
    } else {
        console.log('Toast:', msg);
    }
};


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
