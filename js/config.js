/**
 * WoW Cloud Configuration
 */
const WOW_CONFIG = {
    // 最新のデプロイURL
    cloudUrl: "https://script.google.com/macros/s/AKfycbyUVrMy6AZFiDXDFO7QcEmhFojjGqRof2p6A_HVXfdkA4Wd7IEMeiXGasRg06IQcNtwLg/exec",
    // 認証キー
    apiKey: "kion_sync_99",
    
    // Supabase Configuration
    supabase: {
        url: 'https://bjqfmfiqzmwezlkjbgfn.supabase.co',
        anonKey: 'sb_publishable_Olj5M55D1DnHjua7UZkHHA_u49S6Z2O'
    },

    // Tailwind Configuration
    tailwind: {
        darkMode: "class",
        theme: {
            extend: {
                colors: {
                    "primary": "#0060ad",
                    "on-primary": "#f8f8ff",
                    "secondary": "#426751",
                    "on-secondary": "#e7ffed",
                    "tertiary": "#8a4f46",
                    "on-tertiary": "#fff7f6",
                    "on-surface": "#173355",
                    "on-surface-variant": "#466084",
                    "surface-container-low": "#eff3ff",
                    "surface-container-high": "#dde9ff",
                    "surface-container-highest": "#d4e3ff",
                    "surface-container-lowest": "#ffffff/80",
                },
                fontFamily: {
                    "headline": ["Plus Jakarta Sans", "Noto Sans JP", "sans-serif"],
                    "body": ["Manrope", "Noto Sans JP", "sans-serif"],
                },
                borderRadius: {"DEFAULT": "0.25rem", "lg": "1rem", "xl": "1.5rem", "2xl": "2.5rem", "full": "9999px"},
            },
        },
    }
};

// Apply Tailwind config if tailwind is present
if (typeof tailwind !== 'undefined') {
    tailwind.config = WOW_CONFIG.tailwind;
}
