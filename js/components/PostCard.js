// js/components/PostCard.js

const MATERIAL_ICONS = {
    'ウール': '🧶', 'コットン': '☁️', 'リネン': '🌿', 'デニム': '👖',
    'シルク': '✨', 'ナイロン': '💧', 'レザー': '🖤', 'ニット': '🧣',
    'ネイビー': '🌊', 'ブラック': '🖤', 'ホワイト': '⬜', 'ベージュ': '🌾',
    'ストリート': '🏙️', 'ミニマル': '⬛', 'ヴィンテージ': '📷', 'カジュアル': '👕',
    '#ウール': '🧶', '#秋冬': '🍂', '#ミニマル': '⬛', '#着回し': '🔄',
    '#OOTD': '📸', '#レイヤード': '🧥', '#ストリート': '🏙️'
};

// Fallback when WOW_CONSTANTS not yet loaded
const REACTION_THEMES_FALLBACK = [
    { id: 'cool',   label: 'かっこいい', emoji: '🔥', color: '#FF5722' },
    { id: 'kawaii', label: 'かわいい',   emoji: '❤️', color: '#E91E63' },
    { id: 'dig',    label: 'ディグる',   emoji: '⛏️', color: '#9C27B0' },
    { id: 'emoi',   label: 'エモい',     emoji: '🎨', color: '#FFC107' },
    { id: 'useful', label: '参考になる', emoji: '✅', color: '#4CAF50' },
];

// ===== Shared reaction stats back face template (inlined in each card type) =====
const REACTION_BACK_TEMPLATE = `
    <!-- Dynamic top-glow from winner reaction color -->
    <div class="absolute inset-0 pointer-events-none rounded-xl"
         :style="{ background: topReactions[0] ? 'radial-gradient(ellipse 120% 55% at 50% -5%, ' + topReactions[0].color + '38 0%, transparent 65%)' : 'none' }">
    </div>

    <!-- Close button -->
    <button @click.stop="closeFlip"
        class="absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1)">
        <span class="material-symbols-outlined text-white/40" style="font-size:13px">close</span>
    </button>

    <!-- Header: winner + total -->
    <div class="relative z-10 flex flex-col items-center text-center pt-0.5 pb-1">
        <p class="text-[6.5px] font-black uppercase tracking-[0.45em] text-white/20 mb-2">Reactions</p>
        <template v-if="topReactions[0] && totalReactions > 0">
            <span class="leading-none mb-1"
                  :style="{ fontSize: '2rem', filter: 'drop-shadow(0 0 14px ' + topReactions[0].color + ')' }">{{ topReactions[0].emoji }}</span>
            <p class="font-black text-white/80 mb-0.5" style="font-size:8.5px;letter-spacing:0.08em;">{{ topReactions[0].label }}</p>
        </template>
        <div class="flex items-baseline gap-1 mt-1">
            <span class="font-mono font-black text-white" style="font-size:1.6rem;line-height:1;letter-spacing:-0.04em;"
                  :style="{ color: topReactions[0] ? topReactions[0].color : 'white', textShadow: topReactions[0] ? '0 0 20px ' + topReactions[0].color + '80' : 'none' }">{{ totalReactions }}</span>
            <span class="text-white/25 font-bold" style="font-size:7px;">total</span>
        </div>
    </div>

    <!-- Divider -->
    <div class="relative z-10 border-t border-white/8"></div>

    <!-- Loading state -->
    <div v-if="reactionStatsLoading" class="flex items-center justify-center py-3 gap-1.5 relative z-10">
        <span class="material-symbols-outlined animate-spin text-white/20" style="font-size:15px">progress_activity</span>
        <span class="text-white/20 font-bold" style="font-size:7.5px;">loading…</span>
    </div>

    <!-- Bars -->
    <div v-else class="flex flex-col gap-[7px] flex-1 relative z-10 justify-center">
        <div v-if="!totalReactions" class="text-center" style="font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.1em;">— no reactions yet —</div>
        <template v-else>
            <div v-for="stat in reactionStatsList" :key="stat.id" class="flex items-center gap-2">
                <span class="flex-shrink-0 leading-none" style="font-size:13px;width:16px;text-align:center;">{{ stat.emoji }}</span>
                <div class="flex-1 rounded-full overflow-hidden" style="height:2.5px;background:rgba(255,255,255,0.06)">
                    <div class="h-full rounded-full"
                         :style="{ width: (isFlipped ? stat.pct + '%' : '0%'), background: 'linear-gradient(90deg,' + stat.color + 'ee,' + stat.color + '88)', boxShadow: stat.count > 0 ? '0 0 10px ' + stat.color + '70' : 'none', transition: 'width 0.85s cubic-bezier(0.34,1.56,0.64,1) ' + stat.delay }">
                    </div>
                </div>
                <span class="flex-shrink-0 font-mono font-black text-right" style="font-size:8px;min-width:16px;"
                      :style="{ color: stat.count > 0 ? stat.color : 'rgba(255,255,255,0.12)' }">{{ stat.count || '·' }}</span>
            </div>
        </template>
    </div>

    <!-- Footer -->
    <div class="relative z-10 border-t border-white/8 pt-1.5 flex items-center justify-between">
        <span class="font-black uppercase text-white/20" style="font-size:6.5px;letter-spacing:0.3em;">{{ normalizedCategory }}</span>
        <span class="font-mono text-white/20" style="font-size:7px;">{{ post.temperature || '—' }}°C</span>
    </div>
`;

export const PostCard = {
    name: 'PostCard',
    props: {
        post: { type: Object, required: false, default: () => ({}) },
        type: { type: String, required: true, validator: (v) => ['trending', 'discover', 'qa'].includes(v) },
        isSkeleton: { type: Boolean, default: false }
    },
    template: `
        <!-- ========== TRENDING ========== -->
        <div v-if="type === 'trending'" class="relative" data-card="post-card" :data-post-id="post.id">
            <div class="postcard-flip-wrapper">
                <div :class="['postcard-flip-inner', isFlipped ? 'is-flipped' : '']">

                    <!-- FRONT FACE -->
                    <div class="postcard-flip-face bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-black/[0.05] dark:border-white/[0.06] cursor-pointer select-none"
                         @click="openDetail"
                         @touchstart.passive="onTouchStart" @touchend="onTouchEnd" @touchmove.passive="onTouchMove"
                         @mousedown="onMouseDown" @mouseup="onMouseUp" @mouseleave="onMouseUp">

                        <template v-if="isSkeleton">
                            <div class="w-full aspect-[1/1] bg-gray-100 dark:bg-slate-700 animate-pulse rounded-t-2xl"></div>
                            <div class="p-3 space-y-2">
                                <div class="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full animate-pulse w-3/4"></div>
                                <div class="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full animate-pulse w-1/2"></div>
                            </div>
                        </template>
                        <template v-else>
                            <!-- Image -->
                            <div class="relative overflow-hidden rounded-t-2xl">
                                <img :src="post.image" class="w-full aspect-[1/1] object-cover" loading="lazy">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none"></div>
                                <!-- Temp -->
                                <div class="absolute bottom-3 left-3 font-mono font-black text-white leading-none drop-shadow"
                                     style="font-size:1.15rem;letter-spacing:-0.03em;text-shadow:0 2px 12px rgba(0,0,0,0.6)">
                                    {{ post.temperature }}<span style="font-size:0.6em;opacity:0.55">°</span>
                                </div>
                                <!-- HOLD hint -->
                                <div class="absolute top-2.5 right-2.5 text-white/30 pointer-events-none flex items-center" style="font-size:7px;font-weight:900;letter-spacing:0.15em">
                                    <span class="material-symbols-outlined" style="font-size:9px">touch_app</span>
                                </div>
                                <!-- NEW -->
                                <div v-if="post.isNew" class="absolute top-2.5 left-2.5 bg-primary text-white px-2 py-0.5 rounded-lg text-[7.5px] font-extrabold tracking-wider">NEW</div>
                            </div>

                            <!-- Info section -->
                            <div class="p-2.5 flex flex-col gap-1.5">
                                <!-- User + category -->
                                <div class="flex items-center gap-1.5">
                                    <div class="w-[17px] h-[17px] rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                        <img :src="post.userAvatar" class="w-full h-full object-cover">
                                    </div>
                                    <span class="text-[8.5px] font-bold text-gray-400 dark:text-white/30 flex-1 truncate">{{ post.user }}</span>
                                    <span :class="['px-1.5 py-0.5 rounded-md border text-[7px] font-black tracking-wider uppercase', categoryClass]">
                                        {{ normalizedCategory }}
                                    </span>
                                </div>
                                <!-- Caption -->
                                <p class="text-[10px] font-semibold text-gray-700 dark:text-white/65 leading-snug" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ post.caption }}</p>
                                <!-- Tags -->
                                <div class="flex flex-wrap gap-1">
                                    <span v-for="tag in (post.hashtags||[]).slice(0,3)" :key="tag"
                                          class="text-[7.5px] font-bold text-gray-400 dark:text-white/25 bg-gray-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-slate-700/50">{{ tag }}</span>
                                </div>
                                <!-- Reaction preview -->
                                <div v-if="totalReactions > 0" class="flex items-center gap-1 pt-1 mt-0.5 border-t border-gray-50 dark:border-slate-700/40">
                                    <span v-for="s in topReactions" :key="s.id" class="flex items-center gap-0.5">
                                        <span style="font-size:10px">{{ s.emoji }}</span>
                                        <span class="text-[7px] font-mono font-bold text-gray-300 dark:text-white/20">{{ s.count }}</span>
                                    </span>
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- BACK FACE -->
                    <div class="postcard-flip-back-face postcard-back-bg relative p-3.5 flex flex-col gap-2 rounded-2xl overflow-hidden">
                        ${REACTION_BACK_TEMPLATE}
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== DISCOVER ========== -->
        <div v-else-if="type === 'discover'" class="relative" data-card="post-card" :data-post-id="post.id">
            <div class="postcard-flip-wrapper">
                <div :class="['postcard-flip-inner', isFlipped ? 'is-flipped' : '']">

                    <!-- FRONT FACE -->
                    <div class="postcard-flip-face relative overflow-hidden rounded-2xl cursor-pointer select-none"
                         @click="openDetail"
                         @touchstart.passive="onTouchStart" @touchend="onTouchEnd" @touchmove.passive="onTouchMove"
                         @mousedown="onMouseDown" @mouseup="onMouseUp" @mouseleave="onMouseUp">

                        <template v-if="isSkeleton">
                            <div class="w-full aspect-[3/4] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-2xl"></div>
                        </template>
                        <template v-else>
                            <img :src="post.image" class="w-full aspect-[3/4] object-cover" loading="lazy">
                            <!-- Gradient -->
                            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none"></div>
                            <!-- Bottom info -->
                            <div class="absolute bottom-0 left-0 right-0 p-3">
                                <div class="flex items-end justify-between mb-1.5">
                                    <span :class="['px-2 py-0.5 rounded-lg backdrop-blur-sm text-[7.5px] font-black tracking-[0.2em] uppercase border', categoryClassOverlay]">{{ normalizedCategory }}</span>
                                    <span class="font-mono font-black text-white leading-none" style="font-size:1.4rem;letter-spacing:-0.04em;text-shadow:0 2px 16px rgba(0,0,0,0.5)">{{ post.temperature }}<span style="font-size:0.6em;opacity:0.5">°</span></span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <div class="w-[15px] h-[15px] rounded-full overflow-hidden border border-white/30 flex-shrink-0">
                                        <img :src="post.userAvatar" class="w-full h-full object-cover">
                                    </div>
                                    <span class="text-white/55 font-bold flex-1 truncate" style="font-size:8px">{{ post.user }}</span>
                                    <div v-if="totalReactions > 0" class="flex gap-0.5">
                                        <span v-for="s in topReactions.slice(0,3)" :key="s.id" style="font-size:10px">{{ s.emoji }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- HOLD hint -->
                            <div class="absolute top-2.5 right-2.5 text-white/25 pointer-events-none">
                                <span class="material-symbols-outlined" style="font-size:10px">touch_app</span>
                            </div>
                            <!-- matchedTag or NEW -->
                            <div v-if="post.matchedTag" class="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[7.5px] font-bold text-primary" style="background:rgba(255,255,255,0.92);backdrop-filter:blur(8px)">
                                <span class="material-symbols-outlined text-[10px]">check_circle</span>{{ post.matchedTag }}
                            </div>
                            <div v-else-if="post.isNew" class="absolute top-2.5 left-2.5 bg-primary text-white px-2 py-0.5 rounded-lg text-[7.5px] font-extrabold tracking-wider">NEW</div>
                        </template>
                    </div>

                    <!-- BACK FACE -->
                    <div class="postcard-flip-back-face postcard-back-bg relative p-3.5 flex flex-col gap-2 rounded-2xl overflow-hidden" style="min-height:200px">
                        ${REACTION_BACK_TEMPLATE}
                    </div>
                </div>
            </div>
        </div>

        <!-- ========== Q&A ========== -->
        <div
            v-else-if="type === 'qa'"
            :class="['bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border shadow-sm relative group flex flex-col p-4', 'border-gray-100 dark:border-gray-700']"
            data-card="post-card"
            :data-post-id="post.id"
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
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                            <img v-if="post.userAvatar" :src="post.userAvatar" class="w-full h-full object-cover">
                            <span v-else class="text-[10px] font-bold text-gray-500">{{ post.user ? post.user.charAt(0) : '?' }}</span>
                        </span>
                        <div>
                            <span class="block text-[11px] font-bold text-on-surface dark:text-white">{{ post.user }}</span>
                            <span class="block text-[9px] text-on-surface-variant dark:text-white/40">{{ post.time }}</span>
                        </div>
                    </div>
                    <span v-if="post.isResolved" class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">解決済</span>
                    <span v-else class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">回答募集中</span>
                </div>

                <div class="text-[13px] font-bold dark:text-white/90 text-on-surface leading-relaxed mb-4">
                    {{ post.caption }}
                </div>

                <div v-if="post.image" class="mb-4 rounded-lg overflow-hidden max-h-32 bg-gray-100 dark:bg-slate-700/50 flex cursor-pointer" @click="expandImage">
                    <img :src="post.image" alt="Attached" class="w-full object-cover opacity-90 hover:opacity-100 transition-opacity" loading="lazy">
                </div>

                <!-- Q&A best answer preview -->
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
                        <span class="text-[10px] font-bold font-mono">{{ post.replies }} 回答</span>
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
            isFlipped: false,
            longPressTimer: null,
            touchMoved: false,
            _wasLongPress: false,
            reactionStats: {},
            reactionStatsLoading: false,
        };
    },
    computed: {
        normalizedCategory() {
            if (!this.post) return 'Standard';
            const cat = String(this.post.category).toLowerCase();
            return cat.includes('signature') ? 'Signature' : 'Standard';
        },
        categoryClass() {
            if (this.normalizedCategory === 'Signature') return 'border-amber-400/50 text-amber-600 dark:text-amber-300 bg-transparent';
            return 'border-black/12 dark:border-white/15 text-black/40 dark:text-white/40 bg-transparent';
        },
        categoryClassOverlay() {
            if (this.normalizedCategory === 'Signature') return 'bg-black/50 text-amber-300 backdrop-blur border border-amber-300/25';
            return 'bg-black/45 text-white/65 backdrop-blur border border-white/8';
        },
        reactionThemes() {
            const themes = window.WOW_CONSTANTS?.REACTION_THEMES;
            return themes ? Object.values(themes) : REACTION_THEMES_FALLBACK;
        },
        reactionStatsList() {
            const stats = this.reactionStats;
            const maxCount = Math.max(...Object.values(stats), 1);
            return this.reactionThemes.map((t, i) => ({
                id:    t.id,
                emoji: t.emoji,
                color: t.color,
                label: t.label,
                count: stats[t.id] || 0,
                pct:   Math.round(((stats[t.id] || 0) / maxCount) * 100),
                delay: `${i * 100}ms`,
            }));
        },
        totalReactions() {
            return Object.values(this.reactionStats).reduce((a, b) => a + b, 0);
        },
        topReactions() {
            return this.reactionStatsList.filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
        },
    },
    mounted() {
        this.$el.addEventListener('add-reaction', this.onAddReaction);
    },
    beforeUnmount() {
        this.$el.removeEventListener('add-reaction', this.onAddReaction);
    },
    methods: {
        onAddReaction(e) {
            const rId = e.detail.reactionId;
            this.reactionStats[rId] = (this.reactionStats[rId] || 0) + 1;
        },
        // ===== Long-press → flip =====
        onTouchStart() {
            this.touchMoved = false;
            this._wasLongPress = false;
            this.longPressTimer = setTimeout(() => {
                if (!this.touchMoved) {
                    this._wasLongPress = true;
                    this.flipCard();
                }
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
            this._wasLongPress = false;
            this.longPressTimer = setTimeout(() => {
                this._wasLongPress = true;
                this.flipCard();
            }, 500);
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
        openDetail() {
            if (this._wasLongPress) { this._wasLongPress = false; return; }
            if (navigator.vibrate) navigator.vibrate([8]);
            this.$emit('open-detail', this.post);
        },

        // ===== Image expand (Q&A) =====
        expandImage() {
            this.isImageExpanded = true;
        },

        // ===== Reaction stats =====
        _seedRand(postId, index) {
            const n = String(postId).split('').reduce((a, c) => a + c.charCodeAt(0), index * 31);
            return Math.abs(Math.sin(n) * 43758.5453) % 1;
        },
        async loadReactionStats() {
            if (this.reactionStatsLoading || !this.post?.id) return;
            this.reactionStatsLoading = true;
            try {
                const isMockPost = String(this.post.id).startsWith('post-');
                if (isMockPost) {
                    await new Promise(r => setTimeout(r, 350));
                    const stats = {};
                    this.reactionThemes.forEach((t, i) => {
                        const raw = this._seedRand(this.post.id, i);
                        const count = Math.floor(raw * 48);
                        if (count > 2) stats[t.id] = count;
                    });
                    this.reactionStats = stats;
                } else if (window.PostService) {
                    this.reactionStats = await window.PostService.getReactionStats(this.post.id);
                }
            } catch {}
            this.reactionStatsLoading = false;
        },
    },
    watch: {
        isFlipped(newVal) {
            if (newVal) this.loadReactionStats();
        },
    },
};
