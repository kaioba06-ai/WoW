// ===== フォロー中 / フォロワー 一覧ロジック (Social Logic) =====

const MOCK_USERS_FOLLOWING_INITIAL = [
    { id: 201, name: 'Sartorialist JP', handle: 'sarto_jp', bio: '東京のストリートスナップとクラシック。', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { id: 202, name: 'Elena Rossi', handle: 'elena_style', bio: 'Milan | Fashion Design student. Love linen.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
    { id: 203, name: 'Muji Minimal', handle: 'muji_life', bio: 'ミニマリスト。白とグレーの世界。', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muji' }
];

const MOCK_USERS_FOLLOWERS_INITIAL = [
    { id: 301, name: 'Fashion Scout', handle: 'f_scout', bio: 'Next trend seeker.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Scout' },
    { id: 302, name: 'Hiroshi T.', handle: 'hiro_t', bio: '趣味でコーデ載せてます。よろしくお願いします。', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hiro' },
    { id: 303, name: 'Vintage Collector', handle: 'v_collected', bio: '80s-90s archive.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vintage' },
    { id: 304, name: 'Sarah J.', handle: 'sarah_j', bio: 'London style explorer.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }
];

const SOCIAL_FOLLOW_STATE_KEY = 'kion_social_follow_states';
let currentSocialMode = 'following'; // 'following' or 'followers'
let currentSearchQuery = '';

// 特殊ID
const ALESSANDRO_ID = 'me_alessandro';

function getFollowStates() {
    return JSON.parse(localStorage.getItem(SOCIAL_FOLLOW_STATE_KEY) || '{}');
}

function saveFollowState(userId, state) {
    const states = getFollowStates();
    states[userId] = state;
    localStorage.setItem(SOCIAL_FOLLOW_STATE_KEY, JSON.stringify(states));
}

let socialActiveUserIds = []; // 一覧を開いた瞬間に表示対象だったIDを保持

function toggleSocialPage(mode) {
    if (navigator.vibrate) navigator.vibrate([8]);
    currentSocialMode = mode;
    currentSearchQuery = '';
    
    // 一覧を開いた瞬間の表示対象を確定させる（フォロー解除しても消さないため）
    const states = getFollowStates();
    const isFollowingAlessandro = localStorage.getItem('kion_is_following_alessandro') === 'true';
    
    if (mode === 'following') {
        const initial = MOCK_USERS_FOLLOWING_INITIAL.filter(u => states[u.id] !== false).map(u => u.id);
        const newFromFollowers = MOCK_USERS_FOLLOWERS_INITIAL.filter(u => states[u.id] === true).map(u => u.id);
        socialActiveUserIds = [...initial, ...newFromFollowers];
        if (isFollowingAlessandro) socialActiveUserIds.unshift(ALESSANDRO_ID);
    } else {
        socialActiveUserIds = MOCK_USERS_FOLLOWERS_INITIAL.map(u => u.id);
    }

    // UI初期化
    const titleEl = document.getElementById('social-title');
    if (titleEl) titleEl.textContent = mode === 'following' ? 'フォロー中' : 'フォロワー';
    
    const searchInput = document.getElementById('social-search-input');
    if (searchInput) searchInput.value = '';
    
    renderSocialList();
    openSubPage('social');
}

function renderSocialList() {
    const listContainer = document.getElementById('social-user-list');
    if (!listContainer) return;
    
    const states = getFollowStates();
    const isFollowingAlessandro = localStorage.getItem('kion_is_following_alessandro') === 'true';
    
    // 全ての静的ユーザーを統合
    const allUsers = [
        ...MOCK_USERS_FOLLOWING_INITIAL,
        ...MOCK_USERS_FOLLOWERS_INITIAL
    ];
    
    // Alessandro を追加（プロフ情報から）
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const alessandroObj = {
        id: ALESSANDRO_ID,
        name: profile.name || 'Alessandro Riva',
        handle: profile.handle || 'alessandro_riva',
        bio: profile.bio || 'モダン・ジェントルマンスタイル。',
        avatar: profile.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        isAlessandro: true
    };
    
    // 表示対象を決定（socialActiveUserIds に含まれるユーザーのみ表示）
    let currentPool = allUsers.filter(u => socialActiveUserIds.includes(u.id));
    if (socialActiveUserIds.includes(ALESSANDRO_ID)) {
        currentPool.unshift(alessandroObj);
    }
    
    // 検索フィルター
    let filtered = currentPool;
    if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        filtered = currentPool.filter(u => 
            u.name.toLowerCase().includes(q) || 
            u.handle.toLowerCase().includes(q)
        );
    }
    
    listContainer.innerHTML = '';
    
    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="py-20 text-center opacity-40">
                <span class="material-symbols-outlined text-4xl">search_off</span>
                <p class="text-[12px] font-bold mt-2">${currentSearchQuery ? '見つかりませんでした' : 'ユーザーがいません'}</p>
            </div>`;
    } else {
        filtered.forEach(user => {
            // 現在のフォロー状態を取得
            let isFollowing = (user.id === ALESSANDRO_ID) ? true : states[user.id];
            // 初期フォロー組のデフォルトは true
            if (isFollowing === undefined) {
                isFollowing = MOCK_USERS_FOLLOWING_INITIAL.some(mu => mu.id === user.id);
            }

            const item = document.createElement('div');
            item.className = 'bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between transition-all hover:shadow-md animate-[fadeSlideIn_0.3s_ease_forwards]';
            
            item.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800 shadow-sm">
                        <img src="${user.avatar}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col text-left">
                        <span class="font-headline font-black text-[13px] dark:text-white leading-tight">${user.name}</span>
                        <span class="text-[10px] text-on-surface-variant/70 dark:text-white/40 font-bold mb-1">@${user.handle}</span>
                        <p class="text-[9px] text-on-surface-variant dark:text-white/60 font-medium line-clamp-1">${user.bio}</p>
                    </div>
                </div>
                <button onclick="toggleUserFollowSocial('${user.id}', this)" class="social-follow-btn px-4 py-1.5 rounded-full font-bold text-[9px] transition-all shadow-sm active:scale-95 ${isFollowing ? 'bg-black/5 dark:bg-white/10 text-on-surface-variant dark:text-white border border-black/5 dark:border-white/10' : 'bg-primary text-white'}">
                    ${isFollowing ? 'フォロー中' : 'フォローする'}
                </button>
            `;
            listContainer.appendChild(item);
        });
    }
    
    // プロフィール側の数値を最新化
    updateProfileCountsExplicitly();
}

function filterSocialList(query) {
    currentSearchQuery = query;
    renderSocialList();
}

function toggleUserFollowSocial(userId, btn) {
    if (navigator.vibrate) navigator.vibrate([10, 5]);
    
    if (userId === ALESSANDRO_ID) {
        // Alessandro解除
        localStorage.setItem('kion_is_following_alessandro', 'false');
        if (typeof updateFollowUI === 'function') updateFollowUI(false, true);
        renderSocialList();
        return;
    }

    const states = getFollowStates();
    // 初期状態の判定
    let isFollowing = states[userId];
    if (isFollowing === undefined) {
        isFollowing = MOCK_USERS_FOLLOWING_INITIAL.some(mu => mu.id == userId);
    }
    
    const newState = !isFollowing;
    saveFollowState(userId, newState);
    
    renderSocialList();
}

function updateProfileCountsExplicitly() {
    const states = getFollowStates();
    const isFollowingAlessandro = localStorage.getItem('kion_is_following_alessandro') === 'true';
    
    // フォロー中総数
    const initialFollowingCount = MOCK_USERS_FOLLOWING_INITIAL.filter(u => states[u.id] !== false).length;
    const newFollowingFromFollowersCount = MOCK_USERS_FOLLOWERS_INITIAL.filter(u => states[u.id] === true).length;
    const totalFollowing = initialFollowingCount + newFollowingFromFollowersCount + (isFollowingAlessandro ? 1 : 0);
    
    const followingEl = document.getElementById('profile-following-count');
    if (followingEl) followingEl.textContent = totalFollowing.toLocaleString();
    
    const followerEl = document.getElementById('profile-follower-count');
    if (followerEl) followerEl.textContent = MOCK_USERS_FOLLOWERS_INITIAL.length.toLocaleString();
}

// 初期化登録
window.addEventListener('sectionsLoaded', () => {
    updateProfileCountsExplicitly();
});
