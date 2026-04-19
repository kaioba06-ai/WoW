// ===== [Component] weekly.js — 週間予報タブ専用 DOM 操作 =====
// 依存: app.js (DAY_NAMES), weather.js (getWeatherInfo, getClothingSuggestion)
// index.html の #weekly-container に inject される weekly.html とセット

// 週間コーデ画像
const WEEKLY_OUTFIT_IMGS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAHrJn4azvIQYn4lCFONT_hoI1z0ERDeYSabXsJQ9YBkFC9m2umBqgPX4wToLBtaAPw_WgFtrKBG-pqiXkTkrvkilDHFi5P2nD1hvJtYYtleBPVKql4r5ZnHTg9tyBTv1UbyCEMI92jw6XvNinXiktmCwggqli2bnF8emsRPuBfB-wWwhpdKQO4iSMPQjgET9NuSL6EgOQJHnWAZ8GXZPvWrfQrc9GjywkB0bcGWMTELruQXifNdCqOjJwdLw3MrfG8oVqw8OF4uw',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAaRkINi2JduqKmvssw9miN06u7pb-ZuC_Q42FVre3Twr4oOMbcjBGq_33TB5SHubWOPm6SMovnvO6-Qsh5EQhAN-AwmZ5OcEiHwOWBLdTLmymGEGyaVaVJVBPLWIbJjQAuzVsttLOhgFkyyqAd3UHSSSdEG7xY_NhYtwN4bQfWURuUm5T9qbLWpbapIc0kVwzqttnhGewK6VrZ0wO21ikiDFBVN5TMA9HNhCMkKrN_wyq47tzB_sSbivYUJq3X9fUqM-v3-1aehA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBw7ISmhIPAArDRS6RCoH79XsbAEoyfHRLnkyMFjGpL68CjDUxj-QX0d1OGf_uuXSBJD-AUQxXTqEm5yWE9Z5U24DefO7YHkWhOiwp3B6ogA0UkWTph1brWqrp5yyymPU35fEU0XxBwabD9mPQD5cRxnPih1YW6uA0GhhCc-8EI91cIVbIc8ms3Bn3IRce4794R9qCQ-0YsflNmzls1G3s7O7LVK5tVCF1yTp_cQ5tkLFXYL9bZJhDoew95l0G3Pr2I54wLJjk_NA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCqvBlbyppfUMTJedHiMwUKAMrhIvvvF5DkYEv6g8wA3XB6pwIOrP144xnsxB5vtmAU3sYOi0kPEKqTcBtb_ibzvv6d0_QeyXAawb97eQaGUI8_08YQ-5N3XYpCWJ-LbSYdDQNz_zvwY_1XCYEFjntnVFjs6H0rcX1tbCVZFjbC1IFxhLEAHrrGOCsWIkg4zsrJp4F1V_VUnqvs0ymjRPPMFRuHLByu-kLBpOfgK5eGq0IZToRRyHQtRHD9C01ScAknmPLV57YoXQ',
];

/**
 * 週間予報グリッドを描画する。
 * weather.js の fetchWeatherData() が返すデータをそのまま受け取る。
 * @param {Object} data  Open-Meteo APIレスポンス
 */
function updateWeeklyForecast(data) {
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const dates      = data.daily.time;
    const maxTemps   = data.daily.temperature_2m_max;
    const minTemps   = data.daily.temperature_2m_min;
    const codes      = data.daily.weather_code;
    const precipProbs = data.daily.precipitation_probability_max;

    // past_days=1 のため index 0 は昨日。index 1 が今日。
    let cardIndex = 0;
    for (let i = 1; i < dates.length && cardIndex < 7; i++, cardIndex++) {
        const d         = new Date(dates[i]);
        const isToday   = cardIndex === 0;
        const dayName   = DAY_NAMES[d.getDay()];
        const dateLabel = isToday
            ? `Today / ${d.getMonth()+1}月${d.getDate()}日`
            : `${dayName} / ${d.getDate()}`;
        const maxT       = Math.round(maxTemps[i]);
        const minT       = Math.round(minTemps[i]);
        const weatherInfo = getWeatherInfo(codes[i]);
        const prob        = precipProbs[i];
        const imgSrc      = WEEKLY_OUTFIT_IMGS[cardIndex % WEEKLY_OUTFIT_IMGS.length];
        const suggestion  = getClothingSuggestion(maxT);

        const iconColor = codes[i] <= 3
            ? 'text-orange-400'
            : codes[i] <= 49
            ? 'text-slate-400'
            : 'text-blue-400';

        const detailTip = prob >= 40
            ? `☂ 降水確率 ${prob}% — 折りたたみ傘を忘れずに`
            : `晴れ間を活かした ${suggestion} がおすすめ`;

        const card = document.createElement('div');
        card.className = 'k-card' + (isToday ? ' expanded' : '');
        card.setAttribute('onclick', 'expandFlexCard(this)');
        card.innerHTML = `
            <div class="k-card-main">
                <div class="k-card-info">
                    <span class="k-date-label">${dateLabel}</span>
                    <span class="material-symbols-outlined ${iconColor} ${isToday ? 'text-3xl' : 'text-2xl'} mb-1">${weatherInfo.icon}</span>
                    <span class="k-temp-main dark:text-white">${maxT}° <span class="text-xs opacity-60 font-normal">/ ${minT}°</span></span>
                    <span class="text-[9px] font-bold text-primary dark:text-blue-400 mt-1 opacity-80">${suggestion}</span>
                    ${prob >= 40 ? `<span class="text-[9px] font-bold text-blue-500 dark:text-blue-300 mt-0.5">☂ ${prob}%</span>` : ''}
                </div>
                <div class="k-card-img-wrap">
                    <img src="${imgSrc}" alt="コーデ" loading="lazy" />
                </div>
            </div>
            <div class="k-card-detail">
                <div class="border-t border-black/5 dark:border-white/10 pt-2 text-[10px] text-on-surface-variant dark:text-white/70 font-bold leading-relaxed">
                    ${detailTip}
                </div>
            </div>`;
        grid.appendChild(card);
    }
}

/**
 * カードの展開 / 折りたたみを切り替える。
 * @param {HTMLElement} card  クリックされた .k-card 要素
 */
function expandFlexCard(card) {
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.k-card');
    const isAlreadyExpanded = card.classList.contains('expanded');
    cards.forEach(c => c.classList.remove('expanded'));
    if (!isAlreadyExpanded) {
        card.classList.add('expanded');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * 週間データを再取得してグリッドを更新する。
 * weekly.html の更新ボタンから呼ばれる。
 */
function refreshWeeklyData() {
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="k-card skeleton" style="min-height:130px;"></div>
        <div class="k-card skeleton" style="min-height:130px;"></div>
        <div class="k-card skeleton" style="min-height:130px;"></div>
        <div class="k-card skeleton" style="min-height:130px;"></div>`;
    initWeather(); // weather.js の initWeather → loadWeather → updateWeeklyForecast
}

// 公開インターフェース
window.KionWeekly = {
    updateWeeklyForecast,
    expandFlexCard,
    refreshWeeklyData,
};
