/**
 * Wow Project Constants and Master Data
 */
window.WOW_CONSTANTS = {
    SCENE_PATHS: {
        default: 'none',
        office: 'url("assets/backgrounds/office.png")',
        park:   'url("assets/backgrounds/park.png")',
        beach:  'url("assets/backgrounds/beach.jpg")',
        room:   'url("assets/backgrounds/room.jpg")',
    },

    SCENE_LABELS: {
        default: 'Standard',
        office:  'オフィス街',
        park:    '公園',
        beach:   '海辺の観光地',
        room:    '白い部屋',
    },

    CATEGORY_LABELS: { 
        tops: 'トップス', 
        bottoms: 'ボトムス', 
        outer: 'アウター', 
        shoes: 'シューズ', 
        bag: 'バッグ', 
        other: 'その他' 
    },

    CATEGORY_ICONS: { 
        tops: 'apparel', 
        bottoms: 'accessibility_new', 
        outer: 'dry_cleaning', 
        shoes: 'steps', 
        bag: 'shopping_bag', 
        other: 'more_horiz' 
    },

    REACTION_THEMES: {
        cool: {
            id: 'cool',
            label: 'かっこいい',
            emoji: '🔥',
            color: '#FF5722', // 力強いディープオレンジ
            subs: ['🕶️', '⚡', '🏎️']
        },
        kawaii: {
            id: 'kawaii',
            label: 'かわいい',
            emoji: '❤️',
            color: '#E91E63', // 鮮やかなピンク
            subs: ['🎀', '🧸', '✨']
        },
        dig: {
            id: 'dig',
            label: 'ディグる',
            emoji: '⛏️',
            color: '#9C27B0', // ミステリアスなパープル
            subs: ['🔍', '💎', '💡']
        },
        emoi: {
            id: 'emoi',
            label: 'エモい',
            emoji: '🎨',
            color: '#FFC107', // ノスタルジックなアンバーイエロー
            subs: ['🌆', '🌙', '📸']
        },
        useful: {
            id: 'useful',
            label: '参考になる',
            emoji: '✅',
            color: '#4CAF50', // 信頼感のあるグリーン
            subs: ['📝', '💡', '👏']
        }
    },

    PROFILE_OPTIONS: {
        materials: ['コットン', 'リネン', 'シルク', 'カシミヤ', 'カーフスキン', 'スエード', 'デニム', 'ツイード', 'サテン', 'アクリル', 'ポリエステル', 'ナイロン', 'ウール', 'レーヨン', '麻', '本革', 'スウェット'],
        inspirations: ['Steve McQueen', 'Audrey Hepburn', 'City Boy', 'Minimalist', 'K-Pop Style', 'French Chic', 'Quiet Luxury', 'Techwear'],
        brands: ['Ralph Lauren', 'Jil Sander', 'AURALEE', 'COMOLI', 'ZARA', 'H&M', 'Maison Margiela', 'Prada', 'GU', 'THE NORTH FACE'],
        favoriteColors: [
            { name: 'ホワイト', color: '#FFFFFF' },
            { name: 'ブラック', color: '#000000' },
            { name: 'グレー', color: '#808080' },
            { name: 'ネイビー', color: '#000080' },
            { name: 'ベージュ', color: '#F5F5DC' },
            { name: 'ブラウン', color: '#8B4513' },
            { name: 'カーキ', color: '#F0E68C' },
            { name: 'オリーブ', color: '#808000' },
            { name: 'レッド', color: '#FF0000' },
            { name: 'ブルー', color: '#0000FF' },
            { name: 'グリーン', color: '#008000' },
            { name: 'イエロー', color: '#FFFF00' },
            { name: 'オレンジ', color: '#FFA500' },
            { name: 'ピンク', color: '#FFC0CB' },
            { name: 'サックスブルー', color: '#7BA6D5' },
            { name: 'ラベンダー', color: '#E6E6FA' },
            { name: 'ミント', color: '#98FFED' }
        ]
    }
};
