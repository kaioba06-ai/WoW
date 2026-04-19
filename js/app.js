// ===== 共有データ・定数・ユーティリティ =====

// シーンパス設定
const paths = {
    default: 'none',
    office: 'url("背景/背景：オフィス街.png")',
    park:   'url("背景/背景：公園.png")',
    beach:  'url("背景/背景：海辺の観光地.jpg")',
    room:   'url("背景/背景：白い部屋.jpg")',
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
    if(navigator.vibrate) navigator.vibrate([15]); // 触覚フィードバック
    const t = document.createElement('div');
    t.className = `toast-notif fixed bottom-32 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-full shadow-2xl z-[100] text-[12px] font-bold flex items-center gap-2 whitespace-nowrap border border-white/10`;
    t.innerHTML = `<span class="material-symbols-outlined text-[16px]">info</span> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translate(-50%, 20px)';
        t.style.transition = 'all 0.4s ease';
        setTimeout(() => t.remove(), 400);
    }, 3000);
};

// 15. エラーシェイク
function shakeElement(el) {
    el.classList.add('shake-err');
    setTimeout(()=> el.classList.remove('shake-err'), 600);
}

// 曜日ラベル
const DAY_NAMES = ['日','月','火','水','木','金','土'];
