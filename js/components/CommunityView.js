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
            reactions: Math.floor(Math.random() * 500) + 10,
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
                    <h2 class="text-xl font-black tracking-tight mb-5 mt-2 text-on-surface dark:text-white">Trend Rankings</h2>
                    <div class="flex flex-col gap-4">
                    <!-- Genre Ranking Card -->
                    <div
                        v-for="genre in genres"
                        :key="genre.id"
                        @click="activeTrendingGenre = genre.name; loadPosts(true)"
                        class="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden h-[120px] flex items-center p-4 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                    >
                        <!-- 小窓プレビュー（5枚） -->
                        <div class="absolute inset-0 flex gap-0 opacity-55 dark:opacity-65 pointer-events-none">
                            <img v-for="i in 5" :key="i" :src="'https://picsum.photos/id/' + (genre.rank * 10 + i) + '/200/300'" class="flex-1 object-cover h-full" />
                        </div>
                        <!-- グラデーションオーバーレイ（立体感強化） -->
                        <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to right, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.75) 35%, rgba(255,255,255,0.2) 65%, transparent 100%)"></div>
                        <div class="absolute inset-0 pointer-events-none dark:block hidden" style="background: linear-gradient(to right, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.75) 35%, rgba(15,23,42,0.2) 65%, transparent 100%)"></div>

                        <!-- ランクバッジ（＃１形式） -->
                        <div
                            :class="['trend-rank-badge z-10 flex-shrink-0', 'rank-' + genre.rank]"
                            style="min-width:48px;text-align:center"
                        >
                            {{ toFullWidthRank(genre.rank) }}
                        </div>

                        <h3 class="ml-4 font-black text-xl text-on-surface dark:text-white tracking-widest z-10 drop-shadow">
                            {{ genre.name }}
                        </h3>
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
                    <div v-if="type === 'discover'" class="flex flex-col mb-5 mt-2">
                         <span class="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3 text-center">For You</span>

                         <!-- 検索バー -->
                         <div class="relative mb-3">
                             <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 dark:text-white/30 text-[18px] pointer-events-none">search</span>
                             <input
                                 type="text"
                                 v-model="searchQuery"
                                 @input="onSearchInput"
                                 placeholder="コーデ・素材・気温を検索…"
                                 class="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-full py-3 pl-11 pr-10 border border-white/50 dark:border-white/10 text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm placeholder-gray-400 dark:placeholder-white/25 transition-all"
                             />
                             <!-- クリアボタン -->
                             <button
                                 v-if="searchQuery"
                                 @click="clearSearch"
                                 class="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200/60 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                             >
                                 <span class="material-symbols-outlined text-[14px] text-gray-500 dark:text-white/50">close</span>
                             </button>
                         </div>

                         <!-- 検索中のローディング -->
                         <div v-if="isSearching" class="flex justify-center py-2 mb-2" style="animation: fade-in 0.3s ease">
                             <span class="material-symbols-outlined animate-spin text-primary/40 text-[18px]">progress_activity</span>
                             <span class="text-[10px] font-bold text-gray-400 ml-2">フィルタリング中…</span>
                         </div>

                         <!-- Smart Chips -->
                         <div class="flex overflow-x-auto gap-2 no-scrollbar pb-2 mb-1">
                             <button
                                 v-for="chip in smartChips"
                                 :key="chip.label"
                                 @click="applyChip(chip)"
                                 :class="['flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all active:scale-95 flex items-center gap-1', searchQuery === chip.query ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 backdrop-blur-sm']"
                             >
                                 <span class="text-[12px]">{{ chip.icon }}</span>{{ chip.label }}
                             </button>
                         </div>

                         <!-- Standard / Signature 切り替え -->
                         <div class="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-full w-48 shadow-inner mx-auto">
                            <button 
                                @click="discoverPreference = 'Standard'"
                                :class="['flex-1 p-1.5 rounded-full text-[10px] font-bold transition-all shadow-sm', discoverPreference === 'Standard' ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200']"
                            >Standard</button>
                            <button 
                                @click="discoverPreference = 'Signature'"
                                :class="['flex-1 p-1.5 rounded-full text-[10px] font-bold transition-all shadow-sm', discoverPreference === 'Signature' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200']"
                            >Signature</button>
                         </div>
                    </div>

                    <!-- Trending Child Header (Drill-down back button) -->
                    <div v-if="type === 'trending' && activeTrendingGenre" class="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700/50 pt-2">
                        <button @click="activeTrendingGenre = null" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center active:scale-95 transition-transform">
                            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                        </button>
                        <h2 class="text-sm font-black tracking-tight text-on-surface dark:text-white">Trending in <span class="text-primary dark:text-blue-400">{{ activeTrendingGenre }}</span></h2>
                    </div>
                    
                    <!-- Top control bar (Only for QA since Trending has drilldown and Discover is pure) -->
                    <div v-if="type === 'qa'" class="flex items-center justify-between mb-4">
                        <div class="relative flex-grow mr-3">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-white/40 text-[18px]">search</span>
                            <input type="text" placeholder="Explore Q&A..." class="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full py-3.5 pl-12 pr-4 border border-white/50 dark:border-white/10 text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
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
                        <div v-for="post in filteredPosts" :key="post.id" :class="[post.isExpanded && type === 'discover' ? 'col-span-2' : '']">
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
            discoverPreference: 'Signature',
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
