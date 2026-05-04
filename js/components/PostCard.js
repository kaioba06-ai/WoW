// js/components/PostCard.js

const ADVANCED_REACTIONS = [
    { id: 'cool',   name: 'かっこいい', icon: '⚡', subs: ['😎', '🖤', '🏎️', '🦾', '🧨'], color: '#2C3E50' },
    { id: 'kawaii', name: 'かわいい',   icon: '❤️', subs: ['🎀', '🫶', '🍬', '🌸', '🧸'], color: '#E74C3C' },
    { id: 'dig',    name: 'ディグる',   icon: '⛏️', subs: ['🔍', '🧭', '📜', '🗝️', '🧪'], color: '#9B59B6' },
    { id: 'sense',  name: 'センス',     icon: '✨', subs: ['✨', '🪞', '🥂', '🪄', '🌌'], color: '#F1C40F' },
    { id: 'wear',   name: '真似る',     icon: '📌', subs: ['🧥', '🗓️', '🤳', '👟', '🧤'], color: '#2ECC71' }
];

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
            data-card="reaction-card"
        >
            <!-- 3D Flip Wrapper -->
            <div class="postcard-flip-wrapper" :style="glowStyle">
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

                                <div class="absolute bottom-2 right-2 bg-black/25 text-white/35 px-1.5 py-0.5 text-[7px] font-black tracking-[0.12em] rounded pointer-events-none uppercase">
                                    HOLD
                                </div>
                                <div class="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 text-xs font-mono rounded-lg border border-white/20">
                                    {{ post.temperature }}°C
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

                            <div class="px-2.5 pt-2 pb-3 space-y-1.5 mt-auto">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-1.5">
                                        <span class="w-5 h-5 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                            <img v-if="post.userAvatar" :src="post.userAvatar" class="w-full h-full object-cover">
                                            <span v-else class="text-[10px] font-bold text-gray-500">{{ post.user.charAt(0) }}</span>
                                        </span>
                                        <span class="text-[9px] font-bold text-on-surface-variant dark:text-white/40">{{ post.user }}</span>
                                    </div>
                                    <span :class="['px-2 py-0.5 rounded border text-[8px] font-black tracking-wider uppercase', categoryClass]">
                                        {{ normalizedCategory }}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] pt-2">
                                    <span class="text-[8px] font-black text-black/20 dark:text-white/20 tracking-[0.15em] font-mono uppercase">
                                        {{ post.reactions }} reacts
                                    </span>
                                    <div class="flex gap-1.5" v-if="!isExpanded">
                                        <button @click.stop="triggerDebugDig" class="px-2.5 py-1 border border-black/10 dark:border-white/10 text-black/35 dark:text-white/30 rounded-sm text-[8px] font-black tracking-[0.12em] uppercase active:scale-95 transition-transform flex items-center gap-1 relative z-10">
                                            ⛏ DIG
                                        </button>
                                        <button @click.stop="triggerReaction($event)" class="w-7 h-7 border border-black/10 dark:border-white/10 text-black/35 dark:text-white/30 rounded-full flex items-center justify-center active:scale-90 transition-transform relative z-10">
                                            <span class="material-symbols-outlined text-[13px]">add</span>
                                        </button>
                                    </div>
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
                                <div>
                                    <h4 class="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2 border-t border-gray-100 dark:border-gray-700/50 pt-2 flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">add_reaction</span> Quick React</h4>
                                    <div class="flex overflow-x-auto gap-2 py-1 no-scrollbar items-center">
                                        <button v-for="reaction in advancedReactions" :key="reaction.id" @click.stop="commitReaction(reaction, reaction.icon)" class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8 text-black/60 dark:text-white/60 active:scale-95 transition-transform">
                                            <span class="text-sm leading-none">{{ reaction.icon }}</span>
                                            <span class="text-[8px] font-black tracking-widest uppercase whitespace-nowrap">{{ reaction.name }}</span>
                                        </button>
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
                                <p class="font-mono font-black text-white leading-none tracking-tight" style="font-size:2.4rem">
                                    {{ post.temperature }}<span style="font-size:1.1rem;opacity:0.38" class="ml-0.5">°</span>
                                </p>
                            </div>
                            <span class="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-white/20 text-white/50 mb-1">{{ normalizedCategory }}</span>
                        </div>

                        <!-- リアクション集計（5種） -->
                        <div class="bg-white/5 border border-white/10 rounded-2xl p-3">
                            <p class="text-[8px] font-black uppercase tracking-widest text-white/40 mb-2.5 flex items-center gap-1">
                                <span class="material-symbols-outlined text-[11px]">bar_chart</span> Reactions
                            </p>
                            <div v-for="reaction in advancedReactions" :key="reaction.id" class="back-reaction-row">
                                <span class="text-sm w-5 text-center flex-shrink-0">{{ reaction.icon }}</span>
                                <span class="text-[7.5px] font-bold text-white/55 w-[46px] flex-shrink-0 truncate">{{ reaction.name }}</span>
                                <div class="back-reaction-bar-track">
                                    <div
                                        class="back-reaction-bar-fill"
                                        :style="{ width: getReactionPercent(reaction.id) + '%', background: reaction.color }"
                                    ></div>
                                </div>
                                <span class="font-mono text-[9px] font-black text-white/70 w-6 text-right flex-shrink-0">{{ getReactionCount(reaction.id) }}</span>
                            </div>
                        </div>

                        <!-- ハッシュタグ（最大5個） -->
                        <div>
                            <p class="text-[8px] font-black uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1">
                                <span class="material-symbols-outlined text-[11px]">tag</span> Hashtags
                            </p>
                            <div class="flex flex-wrap gap-1.5">
                                <span
                                    v-for="tag in (post.hashtags || []).slice(0, 5)"
                                    :key="tag"
                                    class="text-[8px] font-black px-2.5 py-1 rounded-full border text-white/75"
                                    :style="{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }"
                                >{{ tag }}</span>
                            </div>
                        </div>

                        <!-- ジャンルエリア（フッター） -->
                        <div class="mt-auto border-t border-white/10 pt-2.5 flex items-center justify-between">
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
            :class="['relative rounded-xl overflow-hidden shadow-sm group cursor-pointer border transition-all duration-500 flex flex-col', activeReaction ? 'z-10' : '', isExpanded ? 'bg-white dark:bg-slate-800 shadow-xl !border-transparent' : 'border-transparent']"
            :style="glowStyle"
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
                    <div v-if="!isExpanded" class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                        <div class="flex items-end justify-between w-full">
                            <div class="flex flex-col gap-1">
                                <span :class="['w-max px-2 py-0.5 rounded text-[8px] font-black tracking-[0.15em] uppercase', categoryClassOverlay]">
                                    {{ normalizedCategory }}
                                </span>
                            </div>
                            <div class="text-white/90 font-mono font-black text-base drop-shadow-md text-right leading-none tracking-tight">
                                {{ post.temperature }}<span class="text-[10px] opacity-60">°</span>
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
                    <div class="flex overflow-x-auto gap-2 py-1 no-scrollbar items-center border-t border-gray-100/60 dark:border-white/[0.06] pt-3">
                        <button v-for="reaction in advancedReactions" :key="reaction.id" @click.stop="commitReaction(reaction, reaction.icon)" class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-transparent text-gray-600 dark:text-white/60 active:scale-95 transition-transform">
                            <span class="text-sm leading-none">{{ reaction.icon }}</span>
                            <span class="text-[8px] font-black tracking-widest uppercase whitespace-nowrap">{{ reaction.name }}</span>
                        </button>
                    </div>
                </div>

                <div v-if="post.matchedTag && !isExpanded" class="absolute top-2 left-2 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[8px] font-bold text-primary dark:text-blue-300 shadow-sm border border-white/20 flex items-center gap-1 pointer-events-none">
                    <span class="material-symbols-outlined text-[10px]">check_circle</span> {{ post.matchedTag }}
                </div>
            </template>
        </div>

        <!-- ========== Q&A ========== -->
        <div
            v-else-if="type === 'qa'"
            :class="['bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border shadow-sm relative group flex flex-col p-4', activeReaction ? 'transition-all duration-500' : 'border-gray-100 dark:border-gray-700']"
            :style="glowStyle"
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
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                            <img v-if="post.userAvatar" :src="post.userAvatar" class="w-full h-full object-cover">
                            <span v-else class="text-[10px] font-bold text-gray-500">{{ post.user.charAt(0) }}</span>
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
                    <button @click.prevent="triggerDebugDig" class="ml-auto px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded text-[9px] font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-1 relative z-10">
                        QUICK DIG ⛏️
                    </button>
                    <button class="flex items-center gap-1 text-on-surface-variant dark:text-white/50 hover:text-rose-500 transition-colors">
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

        <!-- Advanced Reaction Sheet — Dark Editorial -->
        <Teleport to="body">
            <div v-if="showReactionMenu" class="fixed inset-0 z-[10000] flex flex-col justify-end">
                <div class="absolute inset-0 bg-black/65 backdrop-blur-md" @click="closeReactionMenu" style="animation: fade-in 0.2s ease-out"></div>
                <div class="bg-[#0C0C0C]/96 backdrop-blur-2xl rounded-t-[28px] border-t border-white/[0.07] shadow-[0_-24px_64px_rgba(0,0,0,0.9)] px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative z-10" style="animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)">
                    <div class="w-8 h-[3px] bg-white/20 rounded-full mx-auto mb-4"></div>
                    <p class="text-[8px] font-black tracking-[0.4em] uppercase text-white/22 text-center mb-5">REACT</p>

                    <div class="flex overflow-x-auto gap-2.5 px-1 pb-3 no-scrollbar snap-x scroll-smooth">
                        <div v-for="reaction in advancedReactions" :key="reaction.id" class="flex-shrink-0 relative snap-center">
                            <!-- Sub-emoji picker -->
                            <div v-if="heldReaction === reaction.id" class="absolute -top-16 left-1/2 -translate-x-1/2 flex bg-white/10 backdrop-blur-xl shadow-2xl rounded-full p-1.5 border border-white/15 gap-0.5" style="z-index: 11000; animation: fade-in 0.15s ease-out">
                                <button v-for="sub in reaction.subs" @click.stop="commitReaction(reaction, sub)" class="w-8 h-8 flex items-center justify-center text-base hover:bg-white/20 rounded-full transition-colors">{{ sub }}</button>
                            </div>
                            <button
                                @click="commitReaction(reaction)"
                                @touchstart="startPress(reaction.id)"
                                @touchend="endPress"
                                @mousedown="startPress(reaction.id)"
                                @mouseup="endPress"
                                @mouseleave="endPress"
                                class="flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 active:bg-white/15 transition-all"
                            >
                                <span class="text-xl leading-none">{{ reaction.icon }}</span>
                                <span class="text-[9px] font-black tracking-widest uppercase text-white/60 whitespace-nowrap">{{ reaction.name }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    `,

    data() {
        return {
            isImageExpanded: false,
            showReactionMenu: false,
            advancedReactions: ADVANCED_REACTIONS,
            activeReaction: null,
            heldReaction: null,
            pressTimer: null,
            // 3D Flip 関連
            isFlipped: false,
            longPressTimer: null,
            touchMoved: false,
            // モックリアクションカウント（実データがなければランダム値）
            reactionCounts: null
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
        glowStyle() {
            if (!this.activeReaction) return {};
            return {
                boxShadow: `0 0 20px ${this.activeReaction.color}50, inset 0 0 10px ${this.activeReaction.color}20`,
                borderColor: this.activeReaction.color
            };
        },
        // 裏面用：素材リスト（ハッシュタグから生成）
        materialList() {
            const tags = this.post?.hashtags || [];
            return tags.map(tag => {
                const key = Object.keys(MATERIAL_ICONS).find(k => tag.includes(k) || tag === k);
                return { label: tag.replace('#', ''), icon: key ? MATERIAL_ICONS[key] : '📦' };
            });
        },
        // リアクション最大値（パーセント計算用）
        maxReactionCount() {
            const counts = this.reactionCounts || {};
            return Math.max(...Object.values(counts), 1);
        }
    },
    mounted() {
        // モックリアクションカウント初期化
        this.reactionCounts = {};
        ADVANCED_REACTIONS.forEach(r => {
            this.reactionCounts[r.id] = Math.floor(Math.random() * 80) + 5;
        });
    },
    methods: {
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

        // ===== リアクション裏面表示 =====
        getReactionCount(reactionId) {
            return this.reactionCounts?.[reactionId] ?? 0;
        },
        getReactionPercent(reactionId) {
            const count = this.getReactionCount(reactionId);
            return Math.max(8, Math.round((count / this.maxReactionCount) * 100));
        },

        // ===== 通常リアクション =====
        expandImage() {
            this.isImageExpanded = true;
        },
        triggerReaction(event) {
            this.showReactionMenu = true;
            if (navigator.vibrate) navigator.vibrate([10]);
        },
        triggerDebugDig() {
            const digReaction = this.advancedReactions.find(r => r.id === 'dig');
            if (digReaction) this.commitReaction(digReaction, digReaction.icon);
        },
        closeReactionMenu() {
            this.showReactionMenu = false;
            this.heldReaction = null;
        },
        startPress(reactionId) {
            if (this.pressTimer) clearTimeout(this.pressTimer);
            this.pressTimer = setTimeout(() => {
                this.heldReaction = reactionId;
                if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
            }, 400);
        },
        endPress() {
            if (this.pressTimer) clearTimeout(this.pressTimer);
        },
        commitReaction(reaction, specificEmoji = null) {
            this.endPress();
            const finalEmoji = specificEmoji || reaction.icon;
            this.activeReaction = reaction;
            this.closeReactionMenu();
            if (this.post) this.post.reactions++;
            if (this.reactionCounts && this.reactionCounts[reaction.id] !== undefined) {
                this.reactionCounts[reaction.id]++;
            }
            this._scatterHashtagEmojis(reaction);
            if (typeof window._spawnSubEmojiRain === 'function') {
                window._spawnSubEmojiRain(reaction.subs);
            }
            if (typeof window._triggerCelebration === 'function') {
                const reactionObj = { emoji: finalEmoji, color: reaction.color };
                window._triggerCelebration(reactionObj, this.$el);
            } else {
                if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
            }
        },

        _scatterHashtagEmojis(reaction) {
            const card = this.$el;
            if (!card) return;
            const chips = Array.from(card.querySelectorAll('.tag-chip'));
            if (chips.length === 0) return;
            const subs = reaction.subs;
            subs.forEach((emoji, i) => {
                setTimeout(() => {
                    const chip = chips[i % chips.length];
                    const rect = chip.getBoundingClientRect();
                    const ox = (Math.random() - 0.5) * (rect.width + 20);
                    const oy = (Math.random() - 0.5) * 8;
                    const rot = (Math.random() - 0.5) * 40;
                    const el = document.createElement('div');
                    el.textContent = emoji;
                    el.style.cssText = `
                        position:fixed;
                        left:${rect.left + rect.width / 2 + ox}px;
                        top:${rect.top + rect.height / 2 + oy}px;
                        font-size:${0.85 + Math.random() * 0.4}rem;
                        pointer-events:none;
                        z-index:9999;
                        --rot:${rot}deg;
                        animation:hashtagSubFloat ${0.75 + Math.random() * 0.3}s ease-out forwards;
                    `;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 1100);
                }, i * 55);
            });
        }
    }
};
