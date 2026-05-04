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

    REACTION_THEME_MASTER: {
        dig: {
            id: 'dig', label: 'ディグる', emoji: '🕳️', icon: '⛏️', color: '#1A1A2E', rgb: '26,26,46', bg: 'rgba(26,26,46,0.18)', effects: ['💎','🔷','🌟']
        },
        emoi: {
            id: 'emoi', label: 'エモい', emoji: '🌙', icon: '🌇', color: '#FF7F50', rgb: '255,127,80', bg: 'rgba(255,127,80,0.18)', effects: ['🌆','📸','✨']
        },
        cool: {
            id: 'cool', label: 'かっこいい', emoji: '😎', icon: '⚡', color: '#4A90E2', rgb: '74,144,226', bg: 'rgba(74,144,226,0.18)', effects: ['🔥','⚡','😎']
        },
        dress: {
            id: 'dress', label: 'これ着る', emoji: '👕', icon: '👗', color: '#FF4757', rgb: '255,71,87', bg: 'rgba(255,71,87,0.18)', effects: ['👗','🛍️','✨']
        },
        useful: {
            id: 'useful', label: '役に立つ', emoji: '💡', icon: '✅', color: '#2ECC71', rgb: '46,204,113', bg: 'rgba(46,204,113,0.18)', effects: ['💡','✅','📝']
        },
        sense: {
            id: 'sense', label: 'センス', emoji: '🎨', icon: '👑', color: '#F1C40F', rgb: '241,196,15', bg: 'rgba(241,196,15,0.18)', effects: ['🎨','👑','🌟']
        },
        cute: {
            id: 'cute', label: 'かわいい', emoji: '💖', icon: '🎀', color: '#FF80AB', rgb: '255,128,171', bg: 'rgba(255,128,171,0.18)', effects: ['💖','🎀','🌸']
        },
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
