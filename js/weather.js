// ===== [ENGINE] weather.js — DOM操作なし、データ・計算・API取得のみ =====

// ---------- WMO天気コード定義 ----------
const WMO_WEATHER = {
    0:  { desc:'快晴',           emoji:'☀️', icon:'wb_sunny',          iconColor:'text-orange-400' },
    1:  { desc:'ほぼ晴れ',       emoji:'🌤️', icon:'wb_sunny',          iconColor:'text-orange-400' },
    2:  { desc:'晴れ時々曇り',   emoji:'⛅',  icon:'partly_cloudy_day', iconColor:'text-primary dark:text-blue-400' },
    3:  { desc:'曇り',           emoji:'☁️', icon:'cloud',             iconColor:'text-gray-400' },
    45: { desc:'霧',             emoji:'🌫️', icon:'foggy',             iconColor:'text-gray-400' },
    48: { desc:'着氷性の霧',     emoji:'🌫️', icon:'foggy',             iconColor:'text-gray-400' },
    51: { desc:'弱い霧雨',       emoji:'🌦️', icon:'grain',             iconColor:'text-blue-400' },
    53: { desc:'霧雨',           emoji:'🌦️', icon:'grain',             iconColor:'text-blue-400' },
    55: { desc:'強い霧雨',       emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-500' },
    61: { desc:'小雨',           emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-500' },
    63: { desc:'雨',             emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-600' },
    65: { desc:'大雨',           emoji:'🌧️', icon:'rainy_heavy',       iconColor:'text-blue-700' },
    66: { desc:'着氷性の小雨',   emoji:'🧊', icon:'weather_mix',       iconColor:'text-cyan-500' },
    67: { desc:'着氷性の雨',     emoji:'🧊', icon:'weather_mix',       iconColor:'text-cyan-600' },
    71: { desc:'小雪',           emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-300' },
    73: { desc:'雪',             emoji:'❄️', icon:'weather_snowy',     iconColor:'text-sky-400' },
    75: { desc:'大雪',           emoji:'❄️', icon:'severe_cold',       iconColor:'text-sky-500' },
    77: { desc:'霧雪',           emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-300' },
    80: { desc:'にわか雨',       emoji:'🌦️', icon:'rainy_light',       iconColor:'text-blue-400' },
    81: { desc:'強いにわか雨',   emoji:'🌧️', icon:'rainy',             iconColor:'text-blue-600' },
    82: { desc:'激しいにわか雨', emoji:'⛈️', icon:'rainy_heavy',      iconColor:'text-blue-700' },
    85: { desc:'にわか雪',       emoji:'🌨️', icon:'weather_snowy',     iconColor:'text-sky-400' },
    86: { desc:'強いにわか雪',   emoji:'❄️', icon:'severe_cold',       iconColor:'text-sky-500' },
    95: { desc:'雷雨',           emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-yellow-500' },
    96: { desc:'雹を伴う雷雨',   emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-yellow-600' },
    99: { desc:'激しい雹雷雨',   emoji:'⛈️', icon:'thunderstorm',      iconColor:'text-red-500' },
};

function getWeatherInfo(code) {
    return WMO_WEATHER[code] || { desc:'不明', emoji:'❓', icon:'help', iconColor:'text-gray-400' };
}

function isRainy(code) {
    return [51,53,55,61,63,65,66,67,80,81,82,95,96,99].includes(code);
}

function getTimeIcon(hour) {
    if (hour >= 6 && hour < 10) return 'light_mode';
    if (hour >= 10 && hour < 17) return 'partly_cloudy_day';
    if (hour >= 17 && hour < 20) return 'bedtime';
    return 'dark_mode';
}

// ---------- My指数（体感補正）エンジン ----------

const MY_INDEX_KEY = 'kion_my_index';

/**
 * My指数データをlocalStorageから読み込む（DOM操作なし）
 * @returns {{ tempOffset: number, sensitivity: number, feedbackLog: Array }}
 */
function loadMyIndex() {
    try { return JSON.parse(localStorage.getItem(MY_INDEX_KEY)) || {}; }
    catch(e) { return {}; }
}

/**
 * 実測気温 → My体感温度に変換（表示・判定に使用）
 * @param {number} rawTemp  APIから取得した実測気温
 * @returns {number}        体感補正後の気温
 */
function applyMyIndex(rawTemp) {
    const { tempOffset = 0, sensitivity = 1.0 } = loadMyIndex();
    const baseline = 20; // 快適基準温度
    return Math.round(baseline + (rawTemp - baseline + tempOffset) * sensitivity);
}

/**
 * ユーザーの体感フィードバックを記録し、補正パラメーターを再計算して保存する。
 * 完了後に 'kion:myindex-updated' カスタムイベントを発火する。
 * @param {'hot'|'cold'} perceived  ユーザーの体感
 * @param {number} actualTemp       フィードバック時の実測気温
 */
function recordFeedback(perceived, actualTemp) {
    const idx = loadMyIndex();
    const log = idx.feedbackLog || [];

    log.unshift({ ts: Date.now(), perceived, actualTemp });
    if (log.length > 20) log.pop(); // 直近20件のみ保持

    // 直近10件から補正値を再計算
    const recent = log.slice(0, 10);
    const coldCount = recent.filter(f => f.perceived === 'cold').length;
    const hotCount  = recent.filter(f => f.perceived === 'hot').length;
    const diff = coldCount - hotCount; // 寒がり傾向：正 / 暑がり傾向：負

    idx.tempOffset  = Math.max(-5, Math.min(5, diff * 0.6)); // ±5°C に制限
    idx.sensitivity = diff > 3 ? 1.2 : diff < -3 ? 0.8 : 1.0;
    idx.feedbackLog = log;

    localStorage.setItem(MY_INDEX_KEY, JSON.stringify(idx));

    // 他コンポーネントへ変更を通知（home.js 等がリッスン）
    window.dispatchEvent(new CustomEvent('kion:myindex-updated', { detail: idx }));

    return idx; // 呼び出し元が必要なら使用可
}

/**
 * My指数を適用した服装提案を返す（DOM操作なし）
 * @param {number} rawTemp
 * @returns {string}
 */
function getClothingSuggestion(rawTemp) {
    const myTemp = applyMyIndex(rawTemp);
    if (myTemp <= 5)  return 'ダウンコート';
    if (myTemp <= 10) return '厚手コート';
    if (myTemp <= 15) return 'コート着用';
    if (myTemp <= 18) return 'ジャケット';
    if (myTemp <= 22) return 'カーディガン';
    if (myTemp <= 25) return 'シャツ';
    if (myTemp <= 28) return '薄手シャツ';
    return 'Tシャツ';
}

// ---------- API取得（純粋な非同期関数、DOM操作なし） ----------

/**
 * Open-Meteo APIから天気データを取得して返す。
 * 表示処理は呼び出し元（home.js / weekly.js）が担当する。
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}  APIレスポンスのJSONオブジェクト
 */
async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation`
        + `&hourly=temperature_2m,weather_code,precipitation_probability`
        + `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max`
        + `&timezone=auto&forecast_days=8&past_days=1`;
    const res = await fetch(url);
    return res.json();
}

// ---------- 公開インターフェース ----------
// 他ファイルは必ず window.KionWeather 経由でアクセスすること。
// weather.js の内部変数に直接触れてはならない。

window.KionWeather = {
    // データ取得
    fetchData:            fetchWeatherData,
    // My指数
    loadMyIndex,
    applyMyIndex,
    recordFeedback,
    // 計算ユーティリティ
    getClothingSuggestion,
    getWeatherInfo,
    isRainy,
    getTimeIcon,
};
