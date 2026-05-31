// js/components/CommunityView.js

import { PostCard } from './PostCard.js';

// モックアップデータジェネレータ
const generateMockPosts = (startIndex, count, type) => {
    return Array.from({ length: count }).map((_, i) => {
        const id = startIndex + i;
        const isDiscover = type === 'discover';

        const temps = [12, 15, 18, 20, 22, 25];
        const temp = temps[Math.floor(Math.random() * temps.length)];
        const isSignature = Math.random() > 0.6;
        const users = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank'];
        const user = users[Math.floor(Math.random() * users.length)];

        const categories = ['ストリート', 'カジュアル', 'モード', '古着', 'ミニマル', 'シャツ', 'ジャケット', 'パンツ'];
        const matchedCategory = categories[Math.floor(Math.random() * categories.length)];

        const imageId = 100 + id;

        let caption = `今日の気温 ${temp}℃ に合わせたコーディネートです。お気に入りです！`;
        if (type === 'qa') {
            caption = `明日 ${temp}℃ の予報ですが、この ${matchedCategory} に合わせるアウターで悩んでいます。おすすめありますか？`;
        } else if (isDiscover) {
            caption = '';
        }

        // ハッシュタグ：Discoverは5個以上を保証
        const hashtagPool = [
            '#ウール', '#秋冬', '#ミニマル', '#着回し', '#OOTD',
            '#レイヤード', '#ストリート', '#ティックウェア', '#プレッピー',
            '#コットン', '#デニム', '#メンズファッション',
            '#外赤コーデ', '#消濮温度', '#寒さ対策', '#トレンド', '#Y2K',
            '#シンプル'
        ];
        const minTags = isDiscover ? 5 : 3;
        const maxExtra = isDiscover ? 3 : 2;
        const shuffled = [...hashtagPool].sort(() => Math.random() - 0.5);
        const hashtags = shuffled.slice(0, minTags + Math.floor(Math.random() * (maxExtra + 1)));

        const reactionCounts = {
            emoi:   Math.floor(Math.random() * 200) + 5,
            useful: Math.floor(Math.random() * 150) + 5,
            cute:   Math.floor(Math.random() * 180) + 5,
            cool:   Math.floor(Math.random() * 220) + 5,
            dig:    Math.floor(Math.random() * 100) + 5,
        };

        // Q&A 用ベストアンサーのモックデータ
        const mockAnswers = [
            'その気温なら薄手のカーディガンを羽織ると安心です。昼夜の寒暖差にも対応できますよ。',
            'レイヤードで調整がおすすめ！インナーにヒートテックを仕込むと◎',
            '私もいつも悩みますが、結局リネンシャツ一枚で正解でした。風が気持ちいいですよ！',
            'アウターはノーカラージャケットが合いそうです。きれいめにまとまります。',
            'デニムジャケットとの相性抜群です！色味も合わせやすいですし。',
            'その組み合わせなら足元はスニーカーが一番バランスいいと思います。',
            '雨予報の日は撥水加工のあるマウンテンパーカーが鉄板ですね。'
        ];
        const mockAnswerUsers = ['Hana', 'Kou', 'Mika', 'Yui', 'Sota', 'Rin', 'Riku'];
        const answerIdx = Math.floor(Math.random() * mockAnswers.length);
        const hasAnswer = type === 'qa' && Math.random() > 0.3;

        return {
            id: `post-${type}-${id}`,
            user: user,
            userAvatar: `https://i.pravatar.cc/100?img=${(id % 70) + 1}`,
            time: `${Math.floor(Math.random() * 5) + 1} 時間前`,
            category: isSignature ? 'Signature' : 'Standard',
            image: type === 'qa' && Math.random() > 0.5 ? null : `https://picsum.photos/id/${imageId}/${isDiscover ? '300/400' : '400/400'}`,
            temperature: temp,
            caption: caption,
            reactionCounts,
            reactions: Object.values(reactionCounts).reduce((s, v) => s + v, 0),
            isNew: id < 5,
            matchedCategory: matchedCategory,
            isResolved: type === 'qa' ? Math.random() > 0.7 : false,
            hashtags: hashtags,
            isExpanded: false,
            bestAnswer: hasAnswer ? mockAnswers[answerIdx] : null,
            bestAnswerUser: hasAnswer ? mockAnswerUsers[answerIdx] : null
        };
    });
};

export const CommunityView = {
    name: 'CommunityView',
    components: {
        PostCard
    },
    template: `
        <div class="community-vue-app overflow-x-hidden relative">
            
            <!-- Trending Parent View (Genre Ranking) -->
            <transition 
                enter-active-class="transition-all duration-400 ease-out" 
                leave-active-class="transition-all duration-400 ease-in absolute w-full"
                enter-from-class="-translate-x-full opacity-0"
                leave-to-class="-translate-x-full opacity-0"
            >
                <div v-if="type === 'trending' && !activeTrendingGenre" key="trending-parent" class="pb-20 w-full inline-block">
                    <div class="flex items-center gap-2 mb-6 mt-1 px-2">
                        <span class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                            <span class="material-symbols-outlined text-[18px]">local_fire_department</span>
                        </span>
                        <h2 class="text-xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">HOT TRENDS</h2>
                    </div>
                    <div class="flex flex-col gap-6 px-1">
                    <!-- Genre Ranking Card -->
                    <div
                        v-for="genre in genres"
                        :key="genre.id"
                        @click="activeTrendingGenre = genre.name; loadPosts(true)"
                        class="relative overflow-hidden rounded-[32px] h-[160px] cursor-pointer transition-all duration-500 group border border-white/20 dark:border-white/10 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] bg-white dark:bg-slate-800"
                    >
                        <!-- シネマティック画像ストリップ -->
                        <div class="absolute inset-0 flex pointer-events-none transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1">
                            <img v-for="i in 5" :key="i" :src="'https://picsum.photos/id/' + (genre.rank * 10 + i + 20) + '/200/300'" class="flex-1 object-cover h-full opacity-90 transition-all duration-1000" />
                        </div>
                        <!-- カラフルグラデーションオーバーレイ -->
                        <div class="absolute inset-0 pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity" :style="'background:linear-gradient(135deg, ' + (genre.rank === 1 ? '#ef4444, #a855f7' : genre.rank === 2 ? '#3b82f6, #06b6d4' : '#10b981, #3b82f6') + ')'"></div>
                        <div class="absolute inset-0 pointer-events-none" style="background:linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)"></div>
                        <!-- コンテンツ -->
                        <div class="relative z-10 flex flex-col justify-center h-full px-8 drop-shadow-lg">
                            <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 mb-3 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                <span class="text-2xl font-black text-white italic">#{{ genre.rank }}</span>
                            </div>
                            <h3 class="font-headline font-black text-3xl text-white tracking-wider leading-none">{{ genre.name }}</h3>
                        </div>
                        <div class="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white text-primary flex items-center justify-center transition-all duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.2)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                            <span class="material-symbols-outlined text-[28px] font-black">arrow_forward</span>
                        </div>
                    </div>
                    </div>
                </div>
            </transition>

            <transition 
                enter-active-class="transition-all duration-400 ease-out" 
                leave-active-class="transition-all duration-400 ease-in absolute w-full"
                enter-from-class="translate-x-full opacity-0"
                leave-to-class="translate-x-full opacity-0"
            >
                <!-- Trending Child / Discover View -->
                <div v-if="(type === 'trending' && activeTrendingGenre) || type === 'discover' || type === 'qa'" key="content-list" class="w-full inline-block">
                    <!-- Discover Header：検索バー + Smart Chips -->
                    <div v-if="type === 'discover'" class="flex flex-col mb-6 mt-1">
                        <!-- エディトリアルラベル -->
                        <div class="flex items-center mb-4 px-1">
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-primary animate-pulse"></span>
                                <span class="text-[13px] font-black tracking-widest uppercase text-on-surface dark:text-white">FOR YOU</span>
                            </div>
                        </div>

                        <!-- 検索バー -->
                        <div class="relative mb-4 group focus-spin magic-border rounded-[24px]">
                            <div class="absolute inset-0 rounded-[24px] bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"></div>
                            <span class="search-icon material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary dark:text-blue-400 text-[22px] pointer-events-none transition-all group-focus-within:scale-110 z-10">search</span>
                            <input
                                type="text"
                                v-model="searchQuery"
                                @input="onSearchInput"
                                placeholder="どんなスタイルを探してる？ 💭"
                                class="w-full relative z-10 bg-transparent border-none rounded-[24px] py-4 pl-12 pr-12 text-[14px] font-bold dark:text-white focus:outline-none focus:ring-0 transition-all placeholder-black/30 dark:placeholder-white/30"
                            />
                            <button
                                v-if="searchQuery"
                                @click="clearSearch"
                                class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                            >
                                <span class="material-symbols-outlined text-[12px] text-black/50 dark:text-white/50">close</span>
                            </button>
                        </div>

                        <!-- 検索中のローディング -->
                        <div v-if="isSearching" class="flex items-center gap-1.5 py-1.5 mb-1.5">
                            <span class="material-symbols-outlined animate-spin text-black/25 dark:text-white/25 text-[14px]">progress_activity</span>
                            <span class="text-[9px] font-bold text-black/30 dark:text-white/30 tracking-wide">フィルタリング中…</span>
                        </div>

                        <!-- Smart Chips -->
                        <div class="flex overflow-x-auto gap-3 no-scrollbar pb-2 pt-2">
                            <button
                                v-for="chip in smartChips"
                                :key="chip.label"
                                @click="applyChip(chip)"
                                :class="['flex-shrink-0 px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 active:scale-95 flex items-center gap-1.5 border hover-jelly', searchQuery === chip.query ? 'bg-gradient-to-r from-primary to-purple-500 border-transparent text-white shadow-[0_8px_20px_rgba(0,96,173,0.3)] bg-pan' : 'bg-white dark:bg-slate-800 border-black/5 dark:border-white/10 text-on-surface dark:text-white shadow-sm hover:shadow-md']"
                            >
                                <span class="text-[14px] leading-none">{{ chip.icon }}</span><span>{{ chip.label }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Trending Child Header (Drill-down back button) -->
                    <div v-if="type === 'trending' && activeTrendingGenre" class="flex items-center gap-4 mb-8 pt-1">
                        <button @click="activeTrendingGenre = null" class="w-10 h-10 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center active:scale-90 transition-transform flex-shrink-0 hover:bg-black/5 dark:hover:bg-white/5">
                            <span class="material-symbols-outlined text-[16px] dark:text-white ml-1">arrow_back_ios</span>
                        </button>
                        <div class="border-l-2 border-black dark:border-white pl-4">
                            <p class="text-[9px] font-normal uppercase tracking-[0.3em] text-black/40 dark:text-white/40 mb-1">Category</p>
                            <h2 class="text-2xl font-light tracking-wide leading-none text-on-surface dark:text-white uppercase">{{ activeTrendingGenre }}</h2>
                        </div>
                    </div>
                    
                    <!-- Top control bar (QA) -->
                    <div v-if="type === 'qa'" class="flex items-center justify-between mb-8 focus-spin">
                        <div class="relative flex-grow group">
                            <span class="search-icon material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/30 text-[18px] pointer-events-none transition-colors group-focus-within:text-black dark:group-focus-within:text-white">search</span>
                            <input type="text" placeholder="Search questions..." class="w-full bg-transparent border-b border-black/20 dark:border-white/20 rounded-none py-3 pl-10 pr-4 text-[13px] font-normal dark:text-white focus:outline-none focus:border-black dark:focus:border-white placeholder-black/30 dark:placeholder-white/30 transition-all" />
                        </div>
                    </div>

                    <!-- 検索結果カウント -->
                    <div v-if="searchQuery && type === 'discover'" class="mb-3 px-1">
                        <span class="text-[10px] font-bold text-gray-400 dark:text-white/40">
                            {{ filteredPosts.length }} 件の結果
                            <span class="text-primary dark:text-blue-400">「{{ searchQuery }}」</span>
                        </span>
                    </div>

                    <!-- Feed Grid -->
                    <div :class="gridClass">
                        <div v-for="post in filteredPosts" :key="post.id" :class="['postcard-container', post.isExpanded && type === 'discover' ? 'col-span-2' : '']" :data-hashtags="(post.hashtags || []).join(',')">
                            <PostCard 
                                :post="post" 
                                :type="type" 
                                :isExpanded="post.isExpanded"
                                @toggle-expand="post.isExpanded = !post.isExpanded"
                            />
                        </div>
                        
                        <template v-if="isLoading">
                            <PostCard 
                                v-for="i in skeletonCount" 
                                :key="'skeleton-'+i" 
                                :type="type" 
                                :isSkeleton="true" 
                            />
                        </template>
                    </div>
                    
                    <div ref="loadMoreTrigger" class="h-10 w-full flex justify-center items-center mt-4 mb-20 pointer-events-none">
                        <span v-if="isLoading" class="material-symbols-outlined animate-spin text-primary opacity-50">progress_activity</span>
                    </div>
                </div>
            </transition>

        </div>
    `,
    props: {
        type: {
            type: String,
            required: true, // 'trending' または 'discover'
            default: 'trending'
        }
    },
    data() {
        return {
            posts: [],
            isLoading: false,
            page: 1,
            hasMore: true,
            observer: null,
            savedScrollY: 0,
            activeTrendingGenre: null,
            selectedPost: null,
            // 検索関連
            searchQuery: '',
            isSearching: false,
            searchDebounceTimer: null,
            genres: [
                { id: 'standard', name: 'スタンダード', rank: 1 },
                { id: 'signature', name: 'シグネチャー', rank: 2 },
                { id: 'street', name: 'ストリート', rank: 3 },
                { id: 'minimal', name: 'ミニマル', rank: 4 },
                { id: 'vintage', name: 'ヴィンテージ', rank: 5 }
            ],
            closetMaterials: []
        };
    },
    computed: {
        gridClass() {
            return this.type === 'discover' 
                ? 'grid grid-cols-2 gap-2' 
                : 'grid grid-cols-1 gap-6';
        },
        skeletonCount() {
            return this.type === 'discover' ? 4 : 2;
        },
        // Smart Chips：クローゼット素材 + 気温ベース
        smartChips() {
            const chips = [];
            // 現在の気温に基づくチップ
            let currentTemp = 20;
            if (window.KionWeather && typeof window.KionWeather.baseTemp !== 'undefined') {
                currentTemp = window.KionWeather.baseTemp;
            }
            chips.push({ icon: '🌡️', label: `#${currentTemp}度`, query: `#${currentTemp}` });
            if (currentTemp <= 15) {
                chips.push({ icon: '🧥', label: '#厚手', query: '#厚手' });
                chips.push({ icon: '🧣', label: '#寒さ対策', query: '#寒さ対策' });
            } else if (currentTemp >= 25) {
                chips.push({ icon: '☀️', label: '#薄手', query: '#薄手' });
                chips.push({ icon: '💧', label: '#速乾', query: '#速乾' });
            } else {
                chips.push({ icon: '🍃', label: '#薄手', query: '#薄手' });
                chips.push({ icon: '🧥', label: '#レイヤード', query: '#レイヤード' });
            }
            // クローゼットアイテムから素材チップ
            const seen = new Set(['#' + currentTemp + '度', '#厚手', '#薄手', '#速乾', '#レイヤード', '#寒さ対策']);
            try {
                const items = window.closetItems || JSON.parse(localStorage.getItem('kion_closet_items') || '[]');
                const materialKw = ['コットン','ウール','リネン','デニム','ニット','レザー'];
                const matIcons = {'コットン':'☁️','ウール':'🧶','リネン':'🌿','デニム':'👖','ニット':'🧣','レザー':'🖤'};
                items.forEach(item => {
                    const text = String(item.name || '') + ' ' + String(item.category || '');
                    materialKw.forEach(kw => {
                        if (text.includes(kw) && !seen.has('#' + kw)) {
                            seen.add('#' + kw);
                            chips.push({ icon: matIcons[kw] || '📦', label: '#' + kw, query: '#' + kw });
                        }
                    });
                });
            } catch(e) {}
            // デフォルトチップ
            if (chips.length < 5) {
                [{ icon: '📸', label: '#OOTD', query: '#OOTD' }, { icon: '🔄', label: '#着回し', query: '#着回し' }, { icon: '🍂', label: '#秋冬', query: '#秋冬' }].forEach(c => {
                    if (!seen.has(c.label)) chips.push(c);
                });
            }
            return chips;
        },
        // フィルタ適用後のポストリスト
        filteredPosts() {
            if (!this.searchQuery || this.type !== 'discover') return this.posts;
            const q = this.searchQuery.toLowerCase();
            return this.posts.filter(post => {
                const text = [
                    post.caption || '',
                    post.matchedCategory || '',
                    ...(post.hashtags || []),
                    String(post.temperature || ''),
                    post.user || ''
                ].join(' ').toLowerCase();
                return text.includes(q);
            });
        }
    },
    methods: {
        // Phase ③ B案: ジェスチャーリスナーの設定
        setupGestureListeners() {
            const container = this.$el;
            if (!container) return;

            let startX = 0, startY = 0, startTime = 0;
            let isGesture = false;
            let targetCard = null;
            
            // ピンチジェスチャー用
            let isPinching = false;
            let initialPinchDistance = 0;

            const getDistance = (touches) => {
                if (touches.length < 2) return 0;
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                return Math.hypot(dx, dy);
            };

            container.addEventListener('touchstart', e => {
                // PostCardをラップしているコンテナを特定
                const card = e.target.closest('.postcard-container');
                if (!card) return;

                targetCard = card;
                
                if (e.touches.length === 2) {
                    isPinching = true;
                    isGesture = false;
                    initialPinchDistance = getDistance(e.touches);
                    targetCard.style.transition = 'transform 0.1s ease-out, box-shadow 0.2s ease';
                    targetCard.style.zIndex = '50';
                    return;
                }

                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                    startTime = Date.now();
                    isGesture = true;
                    isPinching = false;

                    targetCard.style.transition = 'transform 0.1s ease-out, box-shadow 0.2s ease';
                    targetCard.style.zIndex = '50';
                    targetCard.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                }
            }, { passive: true });

            container.addEventListener('touchmove', e => {
                if (!targetCard) return;

                if (isPinching && e.touches.length === 2) {
                    e.preventDefault();
                    const currentDistance = getDistance(e.touches);
                    const scale = currentDistance / initialPinchDistance;
                    // ピンチイン・アウトに合わせてカードをスケール
                    targetCard.style.transform = `scale(${Math.max(0.5, Math.min(scale, 1.5))})`;
                    return;
                }

                if (!isGesture) return;

                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;

                // 縦スクロールを優先（縦の動きが横より明確に大きい場合のみジェスチャーキャンセル）
                if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) {
                    isGesture = false;
                    if (targetCard) {
                        targetCard.style.transform = '';
                        targetCard.style.zIndex = '';
                        targetCard.style.boxShadow = '';
                    }
                    targetCard = null;
                    return;
                }
                
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    e.preventDefault(); // ジェスチャー中はスクロールを止める
                }
                targetCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 25}deg)`;
            }, { passive: false });

            container.addEventListener('touchend', e => {
                if (!targetCard) return;

                if (isPinching && e.touches.length < 2) {
                    let reactionType = null;
                    const transformStr = targetCard.style.transform;
                    if (transformStr.includes('scale')) {
                        const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
                        if (scaleMatch) {
                            const scale = parseFloat(scaleMatch[1]);
                            // 大きくピンチイン（縮小）またはピンチアウト（拡大）した場合に発火
                            if (scale < 0.8 || scale > 1.2) {
                                reactionType = 'ディグる';
                            }
                        }
                    }
                    if (reactionType) {
                        const tagsStr = targetCard.dataset.hashtags;
                        const tags = tagsStr ? tagsStr.split(',') : [];
                        if (window.ReactionSystem) window.ReactionSystem.trigger(reactionType, tags);
                        targetCard.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease';
                        targetCard.style.transform = '';
                        targetCard.style.boxShadow = '';
                        const tc = targetCard;
                        setTimeout(() => { if(tc) tc.style.zIndex = ''; }, 400);
                    } else {
                        targetCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        targetCard.style.transform = '';
                        setTimeout(() => { if(targetCard) targetCard.style.zIndex = ''; }, 300);
                    }
                    isPinching = false;
                    targetCard = null;
                    return;
                }
                
                if (!isGesture) return;

                const touch = e.changedTouches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                const duration = Date.now() - startTime;
                let reactionType = null;

                // しきい値と時間を緩和して発火しやすく調整
                if (duration < 800) {
                    const threshold = 40;
                    if (dx > threshold && Math.abs(dy) < threshold * 2) reactionType = 'かっこいい';      // RIGHT
                    else if (dx < -threshold && Math.abs(dy) < threshold * 2) reactionType = 'かわいい'; // LEFT
                    else if (dy < -threshold && Math.abs(dx) < threshold * 2) reactionType = 'エモい';   // UP
                    else if (dy > threshold && Math.abs(dx) < threshold * 2) reactionType = '役に立つ';  // DOWN
                }

                if (reactionType) {
                    const tagsStr = targetCard.dataset.hashtags;
                    const tags = tagsStr ? tagsStr.split(',') : [];
                    if (window.ReactionSystem) window.ReactionSystem.trigger(reactionType, tags);
                    // 発火後はカードを消さずに、バウンスして元の位置に戻す
                    targetCard.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease';
                    targetCard.style.transform = '';
                    targetCard.style.boxShadow = '';
                    const tc = targetCard;
                    setTimeout(() => { if(tc) tc.style.zIndex = ''; }, 400);
                } else {
                    targetCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease';
                    targetCard.style.transform = '';
                    targetCard.style.boxShadow = '';
                    setTimeout(() => { if(targetCard) targetCard.style.zIndex = ''; }, 300);
                }
                isGesture = false;
                targetCard = null;
            });
        },
        // ランクを全角小欇イチ（＃１）形式に変換
        toFullWidthRank(rank) {
            const fullWidthHash = '\uff03';
            const fw = ['\uff10','\uff11','\uff12','\uff13','\uff14','\uff15','\uff16','\uff17','\uff18','\uff19'];
            const digits = String(rank).split('').map(d => fw[parseInt(d)] || d).join('');
            return fullWidthHash + digits;
        },
        isMaterialMatch(tag) {
            if (!this.closetMaterials || this.closetMaterials.length === 0) return false;
            return this.closetMaterials.some(m => String(tag).toLowerCase().includes(m.toLowerCase()));
        },
        // 検索：デバウンス付きフィルタリング
        onSearchInput() {
            if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
            this.isSearching = true;
            this.searchDebounceTimer = setTimeout(() => {
                this.isSearching = false;
            }, 350);
        },
        clearSearch() {
            this.searchQuery = '';
            this.isSearching = false;
        },
        applyChip(chip) {
            if (this.searchQuery === chip.query) {
                this.clearSearch();
            } else {
                this.searchQuery = chip.query;
                this.isSearching = true;
                setTimeout(() => { this.isSearching = false; }, 300);
            }
            if (navigator.vibrate) navigator.vibrate([8]);
        },
        async loadPosts(isInitial = false) {
            if (this.isLoading || !this.hasMore) return;
            this.isLoading = true;
            
            // API コールのモック遅延
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 件数を 6件 から 12件（1.5倍〜倍増）に増量して表示密度向上
            let newPosts = generateMockPosts(this.posts.length, 12, this.type);
            
            // ==========================================
            // Discover パーソナライズ・アルゴリズム要件
            // ==========================================
            if (this.type === 'discover') {
                // 気温マッチ用のユーザー現在気温 (window.KionWeatherが無ければ 20℃ をフォールバック)
                let currentTemp = 20;
                if (window.KionWeather && typeof window.KionWeather.baseTemp !== 'undefined') {
                    currentTemp = window.KionWeather.baseTemp;
                }

                // クローゼットキーワード抽出 (素材・厚みなどを重要視)
                let closetItems = [];
                try {
                    closetItems = window.closetItems || JSON.parse(localStorage.getItem('kion_closet_items') || '[]');
                } catch(e) {}
                
                const materialKeywords = ['コットン', 'ウール', 'リネン', 'デニム', 'シルク', 'ナイロン', 'ポリエステル', 'レザー', 'ニット'];
                const thicknessKeywords = ['厚手', '薄手', 'ミドル', '裏起毛', 'シアー', '透け感'];
                
                let extractedKeywords = [];
                closetItems.forEach(item => {
                    const text = (String(item.name || '') + ' ' + String(item.category || '')).toLowerCase();
                    materialKeywords.forEach(kw => { if (text.includes(kw.toLowerCase())) extractedKeywords.push(kw); });
                    thicknessKeywords.forEach(kw => { if (text.includes(kw.toLowerCase())) extractedKeywords.push(kw); });
                });
                this.closetMaterials = extractedKeywords;

                // ユーザー嗜好スコアの設定 (モック)
                const userPref = 'Signature'; 

                newPosts.forEach(post => {
                    let score = 0;
                    const postText = (String(post.caption || '') + ' ' + String(post.matchedCategory || '')).toLowerCase();

                    // 1. 気温マッチ (Strong)
                    const tempDiff = Math.abs(post.temperature - currentTemp);
                    if (tempDiff <= 3) {
                        score += 500;
                        post.matchedTag = '気温ジャストマッチ！';
                    } else if (tempDiff <= 5) {
                        score += 200;
                    }

                    // 2. クローゼット一致 (Medium) : 具体的な素材・生地感のシンクロ率
                    let syncHits = 0;
                    extractedKeywords.forEach(kw => {
                        if (postText.includes(kw.toLowerCase())) syncHits++;
                    });
                    
                    if (syncHits > 0) {
                        score += 300 + (syncHits * 50); // 複数ヒットで加点
                        if (tempDiff > 3) post.matchedTag = '手持ちのアイテムと相性◎';
                    }

                    // 3. 嗜好スコア (Soft)
                    const normalizedCategory = String(post.category).toLowerCase().includes('signature') ? 'Signature' : 'Standard';
                    if (normalizedCategory === userPref) {
                        score += 100;
                        if (!post.matchedTag) post.matchedTag = '好みのスタイル';
                    }

                    post.personalScore = score;
                });
                
                // スコア順にソート（大きい順）
                newPosts.sort((a,b) => b.personalScore - a.personalScore);
            }
            
            this.posts = [...this.posts, ...newPosts];
            this.page++;
            
            // 最大50件でストップするデモ
            if (this.posts.length >= 50) {
                this.hasMore = false;
            }
            
            this.isLoading = false;
        },
        setupObserver() {
            if (this.observer) this.observer.disconnect();
            
            // rootMargin を指定して、下部から200px手前でロードを開始させるUX調整
            const options = {
                root: null,
                rootMargin: '0px 0px 200px 0px',
                threshold: 0
            };
            
            this.observer = new IntersectionObserver((entries) => {
                const target = entries[0];
                if (target.isIntersecting && !this.isLoading && this.hasMore) {
                    this.loadPosts();
                }
            }, options);
            
            if (this.$refs.loadMoreTrigger) {
                this.observer.observe(this.$refs.loadMoreTrigger);
            }
        }
    },
    mounted() {
        this.loadPosts(true).then(() => {
            this.setupObserver();
            this.setupGestureListeners(); // B案のジェスチャーを初期化
        });
    },
    unmounted() {
        if (this.observer) {
            this.observer.disconnect();
        }
    },
    activated() {
        // KeepAliveによりコンポーネントがアクティブに戻ったとき
        // スクロール位置を復元する
        window.scrollTo({ top: this.savedScrollY, behavior: 'auto' });
        if (!this.observer) this.setupObserver();
    },
    deactivated() {
        // コンポーネントが非アクティブになる直前に現在位置を保存
        this.savedScrollY = window.scrollY;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
};
