// js/components/PostCard.js

// 素材・カテゴリキーワードマップ
const MATERIAL_ICONS = {
    'ウール': '🧶', 'コットン': '☁️', 'リネン': '🌿', 'デニム': '👖',
    'シルク': '✨', 'ナイロン': '💧', 'レザー': '🖤', 'ニット': '🧣',
    'ネイビー': '🌊', 'ブラック': '🖤', 'ホワイト': '⬜', 'ベージュ': '🌾',
    'ストリート': '🏙️', 'ミニマル': '⬛', 'ヴィンテージ': '📷', 'カジュアル': '👕',
    '#ウール': '🧶', '#秋冬': '🍂', '#ミニマル': '⬛', '#着回し': '🔄',
    '#OOTD': '📸', '#レイヤード': '🧥', '#ストリート': '🏙️'
};

export const PostCard = {
    name: 'PostCard',
    props: {
        post: {
            type: Object,
            required: false,
            default: () => ({})
        },
        type: {
            type: String,
            required: true,
            validator: (value) => ['trending', 'discover', 'qa'].includes(value)
        },
        isExpanded: {
            type: Boolean,
            default: false
        },
        isSkeleton: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <!-- ========== TRENDING ========== -->
        <div
            v-if="type === 'trending'"
            :class="['relative group flex flex-col', isExpanded ? 'z-10' : '']"
            data-reactions="0"
            data-card="reaction-card"
        >
            <!-- 3D Flip Wrapper -->
            <div class="postcard-flip-wrapper">
                <div :class="['postcard-flip-inner', isFlipped ? 'is-flipped' : '']">

                    <!-- FRONT FACE -->
                    <div
                        class="postcard-flip-face bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border shadow-sm flex flex-col transition-all duration-300 border-gray-100 dark:border-gray-700 cursor-pointer select-none"
                        @click="!isExpanded && $emit('toggle-expand')"
                        @touchstart.passive="onTouchStart"
                        @touchend="onTouchEnd"
                        @touchmove.passive="onTouchMove"
                        @mousedown="onMouseDown"
                        @mouseup="onMouseUp"
                        @mouseleave="onMouseUp"
                    >
                        <template v-if="isSkeleton">
                            <div class="w-full aspect-[1/1] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-t-xl relative">
                                <div class="absolute bottom-2 left-2 w-10 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                            <div class="px-3 py-2 space-y-2 mt-2">
                                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                            </div>
                        </template>
                        <template v-else>
                            <div class="relative cursor-pointer overflow-hidden rounded-t-xl group-hover:opacity-95 transition-opacity">
                                <img :src="post.image" alt="Post" class="w-full aspect-[1/1] object-cover" loading="lazy">
                                <div v-if="post.isNew" class="absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded text-[8px] font-extrabold shadow-md">NEW ✨</div>

                                <div class="absolute bottom-2.5 right-2.5 pointer-events-none">
                                    <p class="text-[6.5px] font-black uppercase tracking-[0.2em] text-white/28 text-right mb-0.5">HOLD</p>
                                </div>
                                <div class="absolute bottom-2.5 left-2.5 pointer-events-none">
                                    <span class="font-mono font-black text-white leading-none" style="font-size:1.25rem;letter-spacing:-0.02em;text-shadow:0 2px 8px rgba(0,0,0,0.5)">{{ post.temperature }}<span style="font-size:0.65rem;opacity:0.45;margin-left:1px">°</span></span>
                                </div>
                            </div>

                            <div class="px-3 py-2 text-[10px] font-bold dark:text-white/80 text-on-surface-variant leading-snug">
                                {{ post.caption }}
                            </div>
                            <div v-if="!isExpanded" class="px-3 pb-1 flex flex-wrap gap-1">
                                <span v-for="tag in (post.hashtags || []).slice(0, 3)" :key="tag" class="tag-chip text-[9px] text-gray-500 dark:text-gray-400">
                                    {{ tag }}
                                </span>
                            </div>

                            <div class="px-3 pt-3 pb-3 mt-auto">
                                <div class="flex items-center gap-2 mb-2.5">
                                    <span class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10">
                                        <img v-if="post.userAvatar" :src="post.userAvatar" class="w-full h-full object-cover">
                                        <span v-else class="w-full h-full flex items-center justify-center text-[10px] font-black bg-gray-100 dark:bg-slate-700 text-gray-500">{{ post.user.charAt(0) }}</span>
                                    </span>
                                    <div class="flex-1 min-w-0">
                                        <span class="block text-[10px] font-black text-on-surface dark:text-white leading-none truncate">{{ post.user }}</span>
                                        <span class="block text-[8px] text-black/28 dark:text-white/28 leading-none mt-0.5">{{ post.time }}</span>
                                    </div>
                                    <span :class="['px-2 py-0.5 rounded text-[7px] font-black tracking-[0.18em] uppercase border flex-shrink-0', categoryClass]">
                                        {{ normalizedCategory }}
                                    </span>
                                </div>
                                <div class="border-t border-black/[0.05] dark:border-white/[0.05] pt-2">
                                    <span class="font-mono text-[7.5px] font-black text-black/18 dark:text-white/18 tracking-[0.2em] uppercase">{{ post.reactions }} reacts</span>
                                </div>
                            </div>

                            <!-- Expanded Inline Content -->
                            <div v-if="isExpanded" class="px-3 pb-4 border-t border-gray-100 dark:border-gray-700/50 pt-3 bg-white/50 dark:bg-slate-800/50 rounded-b-xl" style="animation: slide-down 0.3s ease-out">
                                <button @click.stop="$emit('toggle-expand')" class="absolute top-2 right-2 text-white bg-black/40 border border-white/20 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm z-30 transition-transform active:scale-90 shadow-md">
                                    <span class="material-symbols-outlined text-[16px]">close</span>
                                </button>
                                <div class="mb-3">
                                    <h4 class="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">style</span> Item Breakdown</h4>
                                    <div class="flex flex-wrap gap-1.5">
                                        <span v-for="tag in (post.hashtags || [])" :key="tag" class="tag-chip text-[10px] bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 font-bold shadow-sm text-gray-600 dark:text-gray-300">
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- BACK FACE（3Dフリップ裏面） -->
                    <div class="postcard-flip-back-face postcard-back-bg p-4 flex flex-col gap-3">
                        <!-- × ボタン -->
                        <button
                            @click.stop="closeFlip"
                            class="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm active:scale-90 transition-transform"
                        >
                            <span class="material-symbols-outlined text-[16px]">close</span>
                        </button>

                        <!-- ヘッダー: 気温 + ジャンル -->
                        <div class="pr-10 flex items-end justify-between">
                            <div>
                                <p class="text-[8px] font-black uppercase tracking-[0.35em] text-white/35 mb-0.5">Today's Outfit</p>
                                <p class="font-mono font-black text-white leading-none tracking-tight" style="font-size:2.2rem">
                                    {{ post.temperature }}<span style="font-size:1rem;opacity:0.38" class="ml-0.5">°</span>
                                </p>
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-white/20 text-white/50 mb-1">{{ normalizedCategory }}</span>
                        </div>

                        <!-- リアクション統計 -->
                        <div class="flex-1 min-h-0">
                            <p class="text-[7.5px] font-black uppercase tracking-widest text-white/40 mb-2.5 flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[11px]" style="font-variation-settings:'FILL' 1">favorite</span>
                                Reactions
                                <span class="font-mono text-white/25 ml-auto">{{ totalReactions }}</span>
                            </p>
                            <div class="flex flex-col gap-2.5">
                                <div v-for="r in reactionStats" :key="r.id" class="flex items-center gap-2">
                                    <span class="text-[14px] leading-none w-5 text-center flex-shrink-0">{{ r.emoji }}</span>
                                    <div class="flex-1 relative h-[4px] rounded-full overflow-hidden" style="background:rgba(255,255,255,0.07)">
                                        <div
                                            class="absolute inset-y-0 left-0 rounded-full"
                                            :style="{ width: r.pct + '%', background: r.color, boxShadow: '0 0 6px ' + r.color + '88', transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)' }"
                                        ></div>
                                    </div>
                                    <span class="font-mono text-[9px] font-black w-6 text-right flex-shrink-0 tabular-nums" :style="{ color: r.color }">{{ r.count }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- フッター -->
                        <div class="border-t border-white/10 pt-2.5 flex items-center justify-between">
                            <span class="text-[7.5px] font-black uppercase tracking-[0.25em] text-white/32">{{ normalizedCategory }} · Style</span>
                            <span class="font-mono text-[8px] text-white/32">{{ post.time || post.timestamp || '—' }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== DISCOVER ========== -->
        <div
            v-else-if="type === 'discover'"
            :class="['relative rounded-[28px] overflow-hidden group cursor-pointer border transition-all duration-500 flex flex-col float-hover', isExpanded ? 'bg-white dark:bg-slate-900 shadow-[0_30px_60px_rgba(0,96,173,0.3)] border-primary/30 z-20 scale-[1.02] -translate-y-2' : 'border-black/5 dark:border-white/10 bg-white dark:bg-slate-800 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)]']"
            data-reactions="0"
            data-card="reaction-card"
            @click="!isExpanded && $emit('toggle-expand')"
        >
            <template v-if="isSkeleton">
                <div class="w-full aspect-[3/4] bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            </template>
            <template v-else>
                <div class="relative">
                    <img :src="post.image" alt="Post" :class="['w-full object-cover transition-all duration-500', isExpanded ? 'aspect-[4/3] rounded-t-xl' : 'aspect-[3/4] group-hover:scale-105']" loading="lazy">
                    <button v-if="isExpanded" @click.stop="$emit('toggle-expand')" class="absolute top-2 right-2 text-white bg-black/40 border border-white/20 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm z-30 transition-transform active:scale-90 shadow-md">
                        <span class="material-symbols-outlined text-[16px]">close</span>
                    </button>
                    <div v-if="!isExpanded" class="absolute inset-0 flex flex-col justify-end p-3 pointer-events-none" style="background:linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.42) 38%, rgba(0,0,0,0.04) 68%, transparent 100%)">
                        <div class="flex items-end justify-between w-full">
                            <span :class="['w-max px-2 py-0.5 rounded text-[7px] font-black tracking-[0.18em] uppercase', categoryClassOverlay]">
                                {{ normalizedCategory }}
                            </span>
                            <div class="font-mono font-black text-white leading-none text-right" style="text-shadow:0 2px 10px rgba(0,0,0,0.6)">
                                <span style="font-size:1.3rem;letter-spacing:-0.02em">{{ post.temperature }}</span><span style="font-size:0.6rem;opacity:0.45;margin-left:1px">°</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="isExpanded" class="px-3 pb-3 pt-3 flex flex-col gap-3 bg-white dark:bg-slate-800 rounded-b-xl" style="animation: slide-down 0.3s ease-out">
                    <div class="flex items-center justify-between">
                        <span :class="['px-2 py-0.5 rounded border text-[8px] font-black tracking-wider uppercase shadow-sm', categoryClass]">
                            {{ normalizedCategory }}
                        </span>
                        <div class="text-primary font-mono font-black text-sm drop-shadow-sm text-right leading-none">
                            {{ post.temperature }}<span class="text-[10px]">°C</span>
                        </div>
                    </div>
                    <p class="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-snug">{{ post.caption || 'Outfit Inspiration for Today' }}</p>
                    <div>
                        <div class="flex flex-wrap gap-1.5">
                            <span v-for="tag in (post.hashtags || [])" :key="tag" class="tag-chip text-[9px] bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 font-bold text-gray-500 dark:text-gray-400">
                                {{ tag }}
                            </span>
                        </div>
                    </div>
                </div>

                <div v-if="post.matchedTag && !isExpanded" class="absolute top-2.5 left-2.5 backdrop-blur-md px-2 py-1 rounded-full text-[7.5px] font-black tracking-wide text-white flex items-center gap-1 pointer-events-none" style="background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15)">
                    <span class="material-symbols-outlined text-[9px]" style="font-variation-settings:'FILL' 1">check_circle</span> {{ post.matchedTag }}
                </div>
            </template>
        </div>

        <!-- ========== Q&A ========== -->
        <div
            v-else-if="type === 'qa'"
            class="bg-white dark:bg-slate-800 rounded-[28px] border border-black/5 dark:border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.03)] relative group flex flex-col p-5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] transition-all duration-300 float-hover"
            data-reactions="0"
            data-card="reaction-card"
        >
            <template v-if="isSkeleton">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div class="space-y-1">
                            <div class="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            <div class="w-10 h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                    </div>
                    <div class="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                </div>
                <div class="mb-4 rounded-lg overflow-hidden h-24 w-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div class="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
            </template>
            <template v-else>
                <div class="flex items-center justify-between mb-3.5">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-full overflow-hidden ring-1 ring-black/8 dark:ring-white/10 flex-shrink-0">
                            <img v-if="post.userAvatar" :src="post.userAvatar" class="w-full h-full object-cover">
                            <span v-else class="w-full h-full flex items-center justify-center text-[11px] font-black bg-gray-100 dark:bg-slate-700 text-gray-500">{{ post.user.charAt(0) }}</span>
                        </span>
                        <div>
                            <span class="block text-[11px] font-black text-on-surface dark:text-white leading-none">{{ post.user }}</span>
                            <span class="block text-[8.5px] text-black/30 dark:text-white/30 mt-0.5 leading-none">{{ post.time }}</span>
                        </div>
                    </div>
                    <span v-if="post.isResolved" class="px-2.5 py-1 rounded-full text-[7.5px] font-black tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">解決済</span>
                    <span v-else class="px-2.5 py-1 rounded-full text-[7.5px] font-black tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">回答募集中</span>
                </div>

                <div class="text-[12.5px] font-bold dark:text-white/90 text-on-surface leading-relaxed mb-4">
                    {{ post.caption }}
                </div>

                <div v-if="post.image" class="mb-4 rounded-lg overflow-hidden max-h-32 bg-gray-100 dark:bg-slate-700/50 flex cursor-pointer" @click="expandImage">
                    <img :src="post.image" alt="Attached" class="w-full object-cover opacity-90 hover:opacity-100 transition-opacity" loading="lazy">
                </div>

                <!-- Q&A Peek-a-boo：ベストアンサー/最新回答のチラ見せ -->
                <div v-if="post.bestAnswer" class="mb-3 rounded-lg border-l-[3px] border-primary/40 dark:border-blue-400/40 bg-primary/[0.04] dark:bg-blue-500/[0.06] px-3 py-2.5">
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="material-symbols-outlined text-[12px] text-primary/60 dark:text-blue-400/60">format_quote</span>
                        <span class="text-[8px] font-black uppercase tracking-widest text-primary/50 dark:text-blue-400/50">Best Answer</span>
                    </div>
                    <p class="text-[11px] text-on-surface-variant dark:text-white/55 leading-relaxed line-clamp-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        {{ post.bestAnswer.length > 30 ? post.bestAnswer.substring(0, 30) + '…' : post.bestAnswer }}
                    </p>
                    <span class="text-[8px] font-bold text-primary/40 dark:text-blue-400/40 mt-1 block">by {{ post.bestAnswerUser || '匿名' }}</span>
                </div>

                <div class="flex items-center gap-3 mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <button class="flex items-center gap-1.5 text-on-surface-variant dark:text-white/50 hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-[16px]">forum</span>
                        <span class="text-[10px] font-bold font-mono">{{ post.reactions }} 回答</span>
                    </button>
                    <button class="ml-auto flex items-center gap-1 text-on-surface-variant dark:text-white/50 hover:text-rose-500 transition-colors">
                        <span class="material-symbols-outlined text-[16px]">favorite</span>
                    </button>
                </div>

                <!-- Q&A Image Expansion Modal -->
                <div v-if="isImageExpanded" class="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md transition-opacity" @click.stop="isImageExpanded = false">
                    <button class="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/40 active:scale-90 transition-all rounded-full p-2 flex items-center justify-center shadow-lg" @click="isImageExpanded = false">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                    <img :src="post.image" class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl scale-100" @click.stop>
                </div>
            </template>
        </div>

    `,

    data() {
        return {
            isImageExpanded: false,
            // 3D Flip 関連
            isFlipped: false,
            longPressTimer: null,
            touchMoved: false,
        };
    },
    computed: {
        normalizedCategory() {
            if (!this.post) return 'Standard';
            const cat = String(this.post.category).toLowerCase();
            return cat.includes('signature') ? 'Signature' : 'Standard';
        },
        categoryClass() {
            if (this.normalizedCategory === 'Signature') return 'border-black dark:border-white text-black dark:text-white bg-transparent';
            return 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 bg-transparent';
        },
        categoryClassOverlay() {
            if (this.normalizedCategory === 'Signature') return 'bg-black/60 text-white backdrop-blur-md border border-white/30';
            return 'bg-transparent text-white border border-white/30 backdrop-blur-sm';
        },
        reactionStats() {
            const rc = this.post?.reactionCounts || {};
            const defs = [
                { id: 'emoi',   emoji: '🎨', label: 'エモい',    color: '#9B59B6' },
                { id: 'useful', emoji: '✅', label: '役に立つ',  color: '#27AE60' },
                { id: 'cute',   emoji: '💖', label: 'かわいい',  color: '#FF7675' },
                { id: 'cool',   emoji: '⚡', label: 'かっこいい', color: '#F1C40F' },
                { id: 'dig',    emoji: '🔍', label: 'ディグる',  color: '#00CEC9' },
            ];
            const counts = defs.map(d => ({ ...d, count: rc[d.id] || 0 }));
            const maxCount = Math.max(...counts.map(c => c.count), 1);
            return counts.map(c => ({ ...c, pct: Math.round((c.count / maxCount) * 100) }));
        },
        totalReactions() {
            return this.reactionStats.reduce((s, r) => s + r.count, 0);
        }
    },
    methods: {
        getTempEmoji(temp) {
            const t = Number(temp);
            if(t >= 30) return '🥵';
            if(t >= 25) return '😎';
            if(t >= 20) return '😌';
            if(t >= 15) return '☕';
            if(t >= 10) return '🍂';
            return '🥶';
        },
        // ===== 3D フリップ：長押し検知 =====
        onTouchStart(e) {
            this.touchMoved = false;
            this.longPressTimer = setTimeout(() => {
                if (!this.touchMoved) this.flipCard();
            }, 500);
        },
        onTouchMove() {
            this.touchMoved = true;
            if (this.longPressTimer) clearTimeout(this.longPressTimer);
        },
        onTouchEnd() {
            if (this.longPressTimer) clearTimeout(this.longPressTimer);
        },
        onMouseDown() {
            this.longPressTimer = setTimeout(() => this.flipCard(), 500);
        },
        onMouseUp() {
            if (this.longPressTimer) clearTimeout(this.longPressTimer);
        },
        flipCard() {
            if (navigator.vibrate) navigator.vibrate([15, 20, 15]);
            this.isFlipped = true;
        },
        closeFlip() {
            this.isFlipped = false;
        },

        expandImage() {
            this.isImageExpanded = true;
        }
    }
};
