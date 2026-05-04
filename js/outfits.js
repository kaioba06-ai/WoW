/**
 * WoW (Wear for Weather) - Outfit Catalog Data
 * extracted for better editor performance.
 */

const OUTFIT_CATALOG = {
    cold: [
        {
            title: 'Heavy Puffer & Denim',
            gender: 'male',
            style: 'casual',
            desc: '極寒の1日には保温性の高いダウンジャケット。デニムと合わせてカジュアル防寒。',
            img: 'assets/img/outfits/cold_outfit_fullbody.png',
            items: [
                { label: 'Outer', img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&q=80&w=400' },
                { label: 'Inner', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Bottoms', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Shoes', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Classic Wool Coat',
            gender: 'female',
            style: 'clean',
            desc: 'きれいめなウールコートで、寒さの中でも品格あるルック。スラックスと革靴で引き締め。',
            img: 'assets/img/outfits/personalized_cold.png',
            items: [
                { label: 'Coat', img: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sweater', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Slacks', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Boots', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Layered Fleece',
            gender: 'unisex',
            style: 'outdoor',
            desc: '冷風を防ぐフリースジャケット。レイヤードを活かして動きやすさと暖かさを。',
            img: 'assets/img/outfits/cold_outfit_03.png',
            items: [
                { label: 'Fleece', img: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&q=80&w=400' },
                { label: 'Shirt', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Cargo', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Down Vest & Knit',
            gender: 'male',
            style: 'active',
            desc: 'アクティブに過ごす日はダウンベスト。厚手のニットと合わせれば防寒もバッチリ。',
            img: 'assets/img/outfits/cold_outfit_04.png',
            items: [
                { label: 'Vest', img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&q=80&w=400' },
                { label: 'Knit', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Jeans', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        }
    ],
    mild: [
        {
            title: 'Spring Trench',
            gender: 'female',
            style: 'clean',
            desc: '15度前後の過ごしやすい日には、軽やかなトレンチコートにシャツを合わせて。',
            img: 'assets/img/outfits/personalized_mild.png',
            items: [
                { label: 'Trench', img: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=400' },
                { label: 'Shirt', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Chinos', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Loafers', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Denim & Chinos',
            gender: 'male',
            style: 'casual',
            desc: 'カジュアルな外出に最適なデニムジャケット。チノパンと合わせて王道アメカジ。',
            img: 'assets/img/outfits/mild_outfit_02.png',
            items: [
                { label: 'Jacket', img: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&q=80&w=400' },
                { label: 'Tee', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Chinos', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Light Setup',
            gender: 'male',
            style: 'smart',
            desc: '少しだけフォーマル感を出したい時季のライトセットアップ。',
            img: 'assets/img/outfits/mild_outfit_03.png',
            items: [
                { label: 'Jacket', img: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&get=80&w=400' },
                { label: 'Inner', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Slacks', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Leather', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Knit Cardigan',
            gender: 'female',
            style: 'casual',
            desc: '脱ぎ着しやすいカーディガンで、1日の気温差にしなやかに対応。',
            img: 'assets/img/outfits/mild_outfit_04.png',
            items: [
                { label: 'Cardigan', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Shirt', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Denim', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        }
    ],
    warm: [
        {
            title: 'Cotton Knit Vest',
            gender: 'unisex',
            style: 'trend',
            desc: '少し汗ばむ陽気。半袖Tシャツにニットベストを重ねてこなれ感をプラス。',
            img: 'assets/img/outfits/warm_outfit_01.png',
            items: [
                { label: 'Vest', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Tee', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Wide Pants', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Linen Long Sleeve',
            gender: 'female',
            style: 'natural',
            desc: '通気性の良いリネンシャツで、日差しを避けつつ快適な温度をキープ。',
            img: 'assets/img/outfits/personalized_warm.png',
            items: [
                { label: 'Shirt', img: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Inner', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Slacks', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Loafers', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Light Cardigan',
            gender: 'female',
            style: 'casual',
            desc: '屋内の空調などを見越して、サッと羽織れる薄手の羽織りをメインに。',
            img: 'assets/img/outfits/warm_outfit_fullbody.png',
            items: [
                { label: 'Light Knit', img: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Tank Top', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Denim', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Polo & Chinos',
            gender: 'male',
            style: 'classic',
            desc: '上品さと涼しさを兼ね備えたポロシャツスタイル。足元はスッキリと。',
            img: 'assets/img/outfits/warm_outfit_04.png',
            items: [
                { label: 'Polo', img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400' },
                { label: 'Chinos', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Watch', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        }
    ],
    hot: [
        {
            title: 'Oversize Tee',
            gender: 'unisex',
            style: 'street',
            desc: '25度を超えたら風通しの良いオーバーサイズTシャツ。ショーツで涼しさを極めて。',
            img: 'assets/img/outfits/hot_outfit_fullbody.png',
            items: [
                { label: 'Big Tee', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Shorts', img: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=400' },
                { label: 'Cap', img: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sandals', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Open Collar Shirt',
            gender: 'male',
            style: 'resort',
            desc: 'リゾート感のあるオープンカラーシャツで、夏の開放的な気分に。',
            img: 'assets/img/outfits/hot_outfit_02.png',
            items: [
                { label: 'Shirt', img: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400' },
                { label: 'Tank Top', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
                { label: 'Light Pants', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sandals', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Graphic Tee & Denim',
            gender: 'male',
            style: 'casual',
            desc: 'シンプルな夏の装いを、グラフィックTシャツと色落ちデニムで個性的に。',
            img: 'assets/img/outfits/hot_outfit_03.png',
            items: [
                { label: 'Graphic Tee', img: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Denim', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=400' },
                { label: 'Silver', img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sneaker', img: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' }
            ]
        },
        {
            title: 'Linen Setup',
            desc: '風を通すリネン素材のセットアップ。暑い日でも涼しく上品に。',
            img: 'assets/img/outfits/hot_outfit_04.png',
            items: [
                { label: 'Linen Shirt', img: 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&q=80&w=400' },
                { label: 'Linen Pants', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sunglasses', img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=400' },
                { label: 'Sandals', img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&q=80&w=400' }
            ]
        }
    ]
};

const WEEKLY_OUTFIT_IMGS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHrJn4azvIQYn4lCFONT_hoI1z0ERDeYSabXsJQ9YBkFC9m2umBqgPX4wToLBtaAPw_WgFtrKBG-pqiXkTkrvkilDHFi5P2nD1hvJtYYtleBPVKql4r5ZnHTg9tyBTv1UbyCEMI92jw6XvNinXiktmCwggqli2bnF8emsRPuBfB-wWwhpdKQO4iSMPQjgET9NuSL6EgOQJHnWAZ8GXZPvWrfQrc9GjywkB0bcGWMTELruQXifNdCqOjJwdLw3MrfG8oVqw8OF4uw',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAaRkINi2JduqKmvssw9miN06u7pb-ZuC_Q42FVre3Twr4oOMbcjBGq_33TB5SHubWOPm6SMovnvO6-Qsh5EQhAN-AwmZ5OcEiHwOWBLdTLmymGEGyaVaVJVBPLWIbJjQAuzVsttLOhgFkyyqAd3UHSSSdEG7xY_NhYtwN4bQfWURuUm5T9qbLWpbapIc0kVwzqttnhGewK6VrZ0wO21ikiDFBVN5TMA9HNhCMkKrN_wyq47tzB_sSbivYUJq3X9fUqM-v3-1aehA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBw7ISmhIPAArDRS6RCoH79XsbAEoyfHRLnkyMFjGpL68CjDUxj-QX0d1OGf_uuXSBJD-AUQxXTqEm5yWE9Z5U24DefO7YHkWhOiwp3B6ogA0UkWTph1brWqrp5yyymPU35fEU0XxBwabD9mPQD5cRxnPih1YW6uA0GhhCc-8EI91cIVbIc8ms3Bn3IRce4794R9qCQ-0YsflNmzls1G3s7O7LVK5tVCF1yTp_cQ5tkLFXYL9bZJhDoew95l0G3Pr2I54wLJjk_NA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCqvBlbyppfUMTJedHiMwUKAMrhIvvvF5DkYEv6g8wA3XB6pwIOrP144xnsxB5vtmAU3sYOi0kPEKqTcBtb_ibzvv6d0_QeyXAawb97eQaGUI8_08YQ-5N3XYpCWJ-LbSYdDQNz_zvwY_1XCYEFjntnVFjs6H0rcX1tbCVZFjbC1IFxhLEAHrrGOCsWIkg4zsrJp4F1V_VUnqvs0ymjRPPMFRuHLByu-kLBpOfgK5eGq0IZToRRyHQtRHD9C01ScAknmPLV57YoXQ',
];
