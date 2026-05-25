// ===== [Component] weekly.js — 週間予報タブ専用 DOM 操作 =====
// 依存: app.js (DAY_NAMES), weather.js (getWeatherInfo, getBestOutfit)
// レイアウト: Home画面と同じ Main + Sub 並列。Todayはスキップ（Todayページで表示済み）

// 気温帯に応じた簡易サジェスト文（旧 getClothingSuggestion 相当をインライン化）
function _weeklyClothingSuggestion(maxT) {
    if (maxT >= 28) return '半袖と通気性のいい服装で';
    if (maxT >= 22) return '長袖1枚 or 薄手の羽織りで';
    if (maxT >= 15) return '羽織りで温度調節を';
    if (maxT >= 8)  return 'コートとインナーで防寒';
    return 'しっかり厚着の重ね着スタイル';
}

// 週間コーデ画像（静的プレースホルダー）
const WEEKLY_OUTFIT_IMGS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHrJn4azvIQYn4lCFONT_hoI1z0ERDeYSabXsJQ9YBkFC9m2umBqgPX4wToLBtaAPw_WgFtrKBG-pqiXkTkrvkilDHFi5P2nD1hvJtYYtleBPVKql4r5ZnHTg9tyBTv1UbyCEMI92jw6XvNinXiktmCwggqli2bnF8emsRPuBfB-wWwhpdKQO4iSMPQjgET9NuSL6EgOQJHnWAZ8GXZPvWrfQrc9GjywkB0bcGWMTELruQXifNdCqOjJwdLw3MrfG8oVqw8OF4uw',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAaRkINi2JduqKmvssw9miN06u7pb-ZuC_Q42FVre3Twr4oOMbcjBGq_33TB5SHubWOPm6SMovnvO6-Qsh5EQhAN-AwmZ5OcEiHwOWBLdTLmymGEGyaVaVJVBPLWIbJjQAuzVsttLOhgFkyyqAd3UHSSSdEG7xY_NhYtwN4bQfWURuUm5T9qbLWpbapIc0kVwzqttnhGewK6VrZ0wO21ikiDFBVN5TMA9HNhCMkKrN_wyq47tzB_sSbivYUJq3X9fUqM-v3-1aehA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBw7ISmhIPAArDRS6RCoH79XsbAEoyfHRLnkyMFjGpL68CjDUxj-QX0d1OGf_uuXSBJD-AUQxXTqEm5yWE9Z5U24DefO7YHkWhOiwp3B6ogA0UkWTph1brWqrp5yyymPU35fEU0XxBwabD9mPQD5cRxnPih1YW6uA0GhhCc-8EI91cIVbIc8ms3Bn3IRce4794R9qCQ-0YsflNmzls1G3s7O7LVK5tVCF1yTp_cQ5tkLFXYL9bZJhDoew95l0G3Pr2I54wLJjk_NA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCqvBlbyppfUMTJedHiMwUKAMrhIvvvF5DkYEv6g8wA3XB6pwIOrP144xnsxB5vtmAU3sYOi0kPEKqTcBtb_ibzvv6d0_QeyXAawb97eQaGUI8_08YQ-5N3XYpCWJ-LbSYdDQNz_zvwY_1XCYEFjntnVFjs6H0rcX1tbCVZFjbC1IFxhLEAHrrGOCsWIkg4zsrJp4F1V_VUnqvs0ymjRPPMFRuHLByu-kLBpOfgK5eGq0IZToRRyHQtRHD9C01ScAknmPLV57YoXQ',
];

// 直近6日分のデータをキャッシュ（メインカード切替時の再描画用）
var _weeklyDays = [];
var _weeklySelectedIdx = 0;

/**
 * 週間予報を Home スタイルで描画する。
 * Today（今日）はスキップ、明日から6日分をサブカード化、選択中がメインカードに表示。
 * @param {Object} data  Open-Meteo APIレスポンス
 */
function updateWeeklyForecast(data) {
    const subCol = document.getElementById('weekly-sub-column');
    if (!subCol) return;
    if (!data || !data.daily) return;

    const dates       = data.daily.time;
    const maxTemps    = data.daily.temperature_2m_max;
    const minTemps    = data.daily.temperature_2m_min;
    const codes       = data.daily.weather_code;
    const precipProbs = data.daily.precipitation_probability_max || [];

    // past_days=1: idx 0=昨日 / 1=今日 / 2=明日 ...
    // Todayをスキップして明日から6日分
    _weeklyDays = [];
    for (let i = 2; i < dates.length && _weeklyDays.length < 6; i++) {
        const d = new Date(dates[i]);
        const dayName = DAY_NAMES[d.getDay()];
        const maxT = Math.round(maxTemps[i]);
        const minT = Math.round(minTemps[i]);
        const weatherInfo = getWeatherInfo(codes[i]);
        const prob = precipProbs[i] || 0;
        const suggestion = _weeklyClothingSuggestion(maxT);
        const tip = prob >= 40
            ? `☂ 降水確率 ${prob}% — 折りたたみ傘を忘れずに`
            : `晴れ間を活かした ${suggestion} がおすすめ`;
        const iconColor = codes[i] <= 3 ? 'text-orange-400'
                        : codes[i] <= 49 ? 'text-slate-400'
                        : 'text-blue-400';

        _weeklyDays.push({
            date: d,
            dayName,
            dateLabel: `${dayName} / ${d.getMonth()+1}月${d.getDate()}日`,
            shortLabel: `${d.getMonth()+1}/${d.getDate()} (${dayName})`,
            maxT, minT,
            weatherInfo,
            iconColor,
            prob,
            suggestion,
            tip,
            img: WEEKLY_OUTFIT_IMGS[_weeklyDays.length % WEEKLY_OUTFIT_IMGS.length]
        });
    }

    // サブカード描画
    subCol.innerHTML = '';
    _weeklyDays.forEach((day, idx) => {
        const card = document.createElement('div');
        card.id = `weekly-sub-${idx}`;
        card.onclick = () => selectWeeklyDay(idx);
        card.className = 'home-sub-card group relative overflow-hidden rounded-[20px] bg-white/30 dark:bg-black/20 border border-white/40 dark:border-white/10 shadow-lg backdrop-blur-md cursor-pointer transition-all duration-300';
        card.innerHTML = `
            <img src="${day.img}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onerror="this.src='https://images.unsplash.com/photo-1441984908746-d44ba895ee32?auto=format&fit=crop&q=80&w=400'; this.onerror=null;"
                alt="${day.shortLabel}"/>
            <div class="absolute inset-x-2 bottom-2 p-1.5 bg-black/40 dark:bg-black/60 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl flex items-center justify-between shadow-sm">
                <div><span class="text-[9px] font-black tracking-wider text-white/90 pl-1">${day.shortLabel}</span></div>
                <div class="flex items-center gap-1.5 pr-1">
                    <span class="material-symbols-outlined ${day.iconColor} text-[14px] leading-none drop-shadow-sm">${day.weatherInfo.icon}</span>
                    <span class="text-[12px] font-black text-white">${day.maxT}°</span>
                </div>
            </div>
        `;
        subCol.appendChild(card);
    });

    // 初期選択は明日（idx=0）
    selectWeeklyDay(0);
}

/**
 * サブカードクリックで呼ばれる：メインカードを更新＋サブカードのハイライト切替
 */
function selectWeeklyDay(idx) {
    if (idx < 0 || idx >= _weeklyDays.length) return;
    _weeklySelectedIdx = idx;
    const day = _weeklyDays[idx];

    // メインカード更新
    const mainImg = document.getElementById('weekly-main-img');
    if (mainImg) {
        mainImg.src = day.img;
        mainImg.classList.remove('opacity-0');
        const parent = mainImg.parentElement;
        if (parent) parent.classList.remove('skeleton');
    }
    const dateEl = document.getElementById('weekly-main-date');
    if (dateEl) dateEl.textContent = day.dateLabel;
    const tempEl = document.getElementById('weekly-main-temp');
    if (tempEl) tempEl.textContent = `${day.maxT}°`;
    const tempMinEl = document.getElementById('weekly-main-temp-min');
    if (tempMinEl) tempMinEl.textContent = `/ ${day.minT}°`;
    const emojiEl = document.getElementById('weekly-main-emoji');
    if (emojiEl) {
        emojiEl.textContent = day.weatherInfo.icon;
        emojiEl.className = `material-symbols-outlined text-xl leading-none shrink-0 ${day.iconColor}`;
    }
    const suggEl = document.getElementById('weekly-main-suggestion');
    if (suggEl) suggEl.textContent = day.suggestion;
    const tipEl = document.getElementById('weekly-main-tip');
    if (tipEl) tipEl.textContent = day.tip;

    // サブカードのハイライト
    _weeklyDays.forEach((_, i) => {
        const card = document.getElementById(`weekly-sub-${i}`);
        if (!card) return;
        if (i === idx) {
            card.classList.add('ring-2', 'ring-primary', 'dark:ring-blue-400', 'bg-white/50', 'dark:bg-black/40');
            card.classList.remove('opacity-60');
        } else {
            card.classList.remove('ring-2', 'ring-primary', 'dark:ring-blue-400', 'bg-white/50', 'dark:bg-black/40');
            card.classList.add('opacity-60');
        }
    });
}

/**
 * 週間データを再取得してグリッドを更新する。
 * weekly.html の更新ボタンから呼ばれる。
 */
function refreshWeeklyData() {
    const subCol = document.getElementById('weekly-sub-column');
    if (subCol) {
        subCol.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const s = document.createElement('div');
            s.className = 'home-sub-card skeleton';
            s.style.minHeight = '80px';
            subCol.appendChild(s);
        }
    }
    const mainCard = document.getElementById('weekly-main-card');
    if (mainCard) mainCard.classList.add('skeleton');
    initWeather();
}

// グローバル公開
window.selectWeeklyDay = selectWeeklyDay;
window.refreshWeeklyData = refreshWeeklyData;

// 公開インターフェース
window.KionWeekly = {
    updateWeeklyForecast,
    refreshWeeklyData,
    selectWeeklyDay
};
