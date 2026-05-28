// ===== [Component] weekly.js — 週間ページ =====
// 新レイアウト: Main + Right 3 slots + Bottom 5 days
// 依存: app.js (DAY_NAMES)

// 状態
var _wkDays = [];           // シートから取得した6日分のデータ
var _wkSelectedDay = 0;     // 0..5
var _wkSelectedSlot = 0;    // 0..2 (朝/昼/夜)

// 「明日」起点の6日間のラベル ['月','火','水','木','金','土'] 等を動的計算
function _wkComputeDayLabels() {
    const labels = ['日','月','火','水','木','金','土'];
    const todayDow = new Date().getDay();
    const result = [];
    for (let i = 1; i <= 6; i++) {
        result.push(labels[(todayDow + i) % 7]);
    }
    return result;
}

const SLOT_LABELS = ['朝', '昼', '夜'];
const SLOT_HOUR_LABEL = { '朝': '7時', '昼': '13時', '夜': '21時' };
function _wkSlotTimeLabel(day, slot) {
    // 曜日はカード外側の枠で表示しているため時刻のみ返す
    return SLOT_HOUR_LABEL[slot.slot_label] || slot.slot_label;
}

/**
 * APIから取得した weekly_scenes データを内部状態に格納＋描画
 */
function applyWeeklyScenes(apiData) {
    const dayLabels = _wkComputeDayLabels();
    const apiDays = (apiData && apiData.days) || [];

    _wkDays = [];
    for (let i = 0; i < 6; i++) {
        const apiDay = apiDays[i] || {};
        const apiSlots = apiDay.slots || [];
        const slots = [];
        for (let s = 0; s < 3; s++) {
            const apiSlot = apiSlots[s] || {};
            slots.push({
                slot_label: SLOT_LABELS[s],
                time: apiSlot.time || '',
                feels_temp: apiSlot.feels_temp,
                weather: apiSlot.weather || '',
                outfit_name: apiSlot.outfit_name || '',
                one_point: apiSlot.one_point || '',
                scene_image: apiSlot.scene_image || null
            });
        }
        _wkDays.push({
            day_label: dayLabels[i],
            slots: slots
        });
    }
    renderWeekly();
}

function renderWeekly() {
    renderWeeklyMain();
    renderWeeklyRight();
    renderWeeklyBottom();
}

function renderWeeklyMain() {
    const day = _wkDays[_wkSelectedDay];
    if (!day) return;
    const slot = day.slots[_wkSelectedSlot];
    if (!slot) return;

    const imgEl = document.getElementById('weekly-main-img');
    if (imgEl) {
        if (slot.scene_image && slot.scene_image.startsWith('http')) {
            imgEl.src = slot.scene_image;
            imgEl.classList.remove('opacity-0');
            const card = document.getElementById('weekly-main-card');
            if (card) card.classList.remove('skeleton');
        }
    }
    const labelEl = document.getElementById('weekly-main-day-slot');
    if (labelEl) labelEl.textContent = _wkSlotTimeLabel(day, slot);
    const dayChipEl = document.getElementById('weekly-main-day-chip');
    if (dayChipEl) dayChipEl.textContent = day.day_label || '--';
    const tempEl = document.getElementById('weekly-main-temp');
    if (tempEl) tempEl.textContent = (slot.feels_temp != null && slot.feels_temp !== '') ? `${slot.feels_temp}°` : '--°';
    const nameEl = document.getElementById('weekly-main-name');
    if (nameEl) nameEl.textContent = slot.outfit_name || '生成待ち';
    const tipEl = document.getElementById('weekly-main-tip');
    if (tipEl) tipEl.textContent = slot.one_point || `${_wkSlotTimeLabel(day, slot)}のコーデをここに表示`;
}

function renderWeeklyRight() {
    const day = _wkDays[_wkSelectedDay];
    if (!day) return;
    for (let s = 0; s < 3; s++) {
        const slot = day.slots[s];
        const card = document.getElementById(`weekly-slot-${s}`);
        if (!card) continue;
        card.onclick = () => selectWeeklySlot(s);
        const img = card.querySelector('img');
        if (img && slot.scene_image && slot.scene_image.startsWith('http')) {
            img.src = slot.scene_image;
        }
        const labelEl = card.querySelector('.weekly-slot-label');
        if (labelEl) labelEl.textContent = _wkSlotTimeLabel(day, slot);
        const tempEl = card.querySelector('.weekly-slot-temp');
        if (tempEl) tempEl.textContent = (slot.feels_temp != null && slot.feels_temp !== '') ? `${slot.feels_temp}°` : '--°';

        // 選択中ハイライト
        if (s === _wkSelectedSlot) {
            card.classList.add('is-active');
            card.classList.remove('opacity-60');
        } else {
            card.classList.remove('is-active');
            card.classList.add('opacity-60');
        }
    }
}

function renderWeeklyBottom() {
    const row = document.getElementById('weekly-bottom-row');
    if (!row) return;
    row.innerHTML = '';
    // 選択中以外の5日を表示
    for (let i = 0; i < _wkDays.length; i++) {
        if (i === _wkSelectedDay) continue;
        const day = _wkDays[i];
        // 代表スロット: 現在選択中の時間帯を維持して、その日の同じ時間帯を表示
        const slot = day.slots[_wkSelectedSlot] || day.slots[0] || {};
        const card = document.createElement('div');
        card.className = 'weekly-day-card';
        card.onclick = () => selectWeeklyDay(i);
        const imgSrc = (slot.scene_image && slot.scene_image.startsWith('http'))
            ? slot.scene_image
            : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const tempText = (slot.feels_temp != null && slot.feels_temp !== '')
            ? `${slot.feels_temp}°` : '--°';
        card.innerHTML = `
            <img src="${imgSrc}"
                onerror="this.src='https://images.unsplash.com/photo-1441984908746-d44ba895ee32?auto=format&fit=crop&q=80&w=400'; this.onerror=null;"/>
            <div class="weekly-day-overlay">
                <span class="weekly-day-label">${day.day_label}曜</span>
            </div>
            <span class="weekly-day-temp">${tempText}</span>
        `;
        row.appendChild(card);
    }
}

/**
 * 日付切替（時間帯は維持）
 */
function selectWeeklyDay(dayIdx) {
    if (dayIdx < 0 || dayIdx >= _wkDays.length) return;
    _wkSelectedDay = dayIdx;
    renderWeekly();
}

/**
 * 時間帯切替（同じ日のなかで）
 */
function selectWeeklySlot(slotIdx) {
    if (slotIdx < 0 || slotIdx > 2) return;
    _wkSelectedSlot = slotIdx;
    renderWeeklyMain();
    renderWeeklyRight();
    renderWeeklyBottom();  // 下5枚も同じ時間帯の画像に切替
}

/**
 * APIフェッチ＋初期描画
 */
async function loadWeekly() {
    // 初期はプレースホルダーで描画
    applyWeeklyScenes({ days: [] });

    if (typeof WOW_CONFIG === 'undefined' || !WOW_CONFIG.cloudUrl) return;
    try {
        const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
        const userId = profile.handle || 'unknown';
        if (userId === 'unknown') return;
        const url = `${WOW_CONFIG.cloudUrl}?action=weekly_scenes&apiKey=${encodeURIComponent(WOW_CONFIG.apiKey)}&user_id=${encodeURIComponent(userId)}`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && data.success && data.days) {
            applyWeeklyScenes(data);
        }
    } catch (e) {
        console.warn('[Weekly] loadWeekly failed:', e);
    }
}

// 旧API互換（weather.js から呼ばれる関数を空実装で残す）
function updateWeeklyForecast(_data) { /* no-op: 新weeklyページはGAS経由のweekly_scenesを直接読みに行く */ }

/**
 * Open-Meteo の lastWeatherData から指定日(明日起点 0..5)の
 * 朝7/昼13/夜21 スロット payload を組み立て
 */
function _buildWeeklyDayPayload(dayOffset) {
    const w = (typeof lastWeatherData !== 'undefined') ? lastWeatherData : null;
    if (!w || !w.hourly || !w.hourly.time) return null;

    const dayLabels = ['日','月','火','水','木','金','土'];
    const target = new Date();
    target.setDate(target.getDate() + 1 + dayOffset); // +1 = 明日起点
    const dayLabel = dayLabels[target.getDay()];
    const isoDate = target.toISOString().slice(0, 10); // YYYY-MM-DD

    const times = w.hourly.time;
    const apparent = w.hourly.apparent_temperature || w.hourly.temperature_2m || [];
    const codes = w.hourly.weather_code || [];

    const slotDefs = [
        { slot_label: '朝', hour: 7,  time: '07:00' },
        { slot_label: '昼', hour: 13, time: '13:00' },
        { slot_label: '夜', hour: 21, time: '21:00' }
    ];

    const slots = slotDefs.map(s => {
        const idx = times.findIndex(t => {
            const d = new Date(t);
            return d.getFullYear() === target.getFullYear()
                && d.getMonth() === target.getMonth()
                && d.getDate() === target.getDate()
                && d.getHours() === s.hour;
        });
        const temp = idx >= 0 ? Math.round(apparent[idx]) : null;
        const code = idx >= 0 ? codes[idx] : 0;
        const wInfo = (typeof getWeatherInfo === 'function') ? getWeatherInfo(code) : { desc: '晴れ' };
        const lv = (temp != null && typeof getThermalLevel === 'function') ? getThermalLevel(temp) : 5;
        return {
            slot_label: s.slot_label,
            time: s.time,
            temp: temp != null ? temp : 20,
            lv: lv,
            weather: wInfo.desc || '晴れ'
        };
    });

    return {
        day_label: dayLabel,
        date: isoDate,
        slots: slots
    };
}

/**
 * 週間生成（6日 × 3スロット）を直列で実行
 * - 本物の天気予報(lastWeatherData)から payload を組み立て
 * - GAS の 6分タイムアウトを避けるため日単位で sync_weekly_day を呼ぶ
 */
async function generateWeeklyAll() {
    if (typeof WOW_CONFIG === 'undefined' || !WOW_CONFIG.cloudUrl) {
        alert('クラウド設定が見つかりません');
        return;
    }
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const userId = profile.handle || 'unknown';
    if (userId === 'unknown') {
        alert('プロフィール未設定です');
        return;
    }
    if (typeof lastWeatherData === 'undefined' || !lastWeatherData) {
        alert('天気データがまだ取得できていません。少し待ってから再試行してください');
        return;
    }

    const btn = document.getElementById('weekly-generate-btn');
    const label = document.getElementById('weekly-generate-btn-label');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-60', 'pointer-events-none');
    }

    let failCount = 0;
    for (let day = 0; day < 6; day++) {
        if (label) label.textContent = `生成中 ${day + 1}/6`;
        const dayPayload = _buildWeeklyDayPayload(day);
        if (!dayPayload) {
            console.warn(`[Weekly] day ${day} payload missing`);
            failCount++;
            continue;
        }

        const body = JSON.stringify({
            apiKey: WOW_CONFIG.apiKey,
            type: 'weekly_day',
            data: { user_id: userId, day_index: day, day: dayPayload }
        });

        try {
            console.log(`[Weekly] generating day ${day}...`, dayPayload);
            // text/plain で送って CORS preflight を回避
            const resp = await fetch(WOW_CONFIG.cloudUrl, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: body
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (!data || !data.success) {
                console.warn(`[Weekly] day ${day} failed:`, data);
                failCount++;
            } else {
                console.log(`[Weekly] day ${day} done`);
                await loadWeekly();
            }
        } catch (e) {
            console.error(`[Weekly] day ${day} error:`, e);
            failCount++;
        }
    }

    if (label) {
        label.textContent = failCount === 0 ? '完了 ✓' : `完了 (失敗${failCount}日)`;
    }
    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-60', 'pointer-events-none');
        }
        if (label) label.textContent = '週間プランを生成';
    }, 3000);
}

/**
 * メインカードタップ → Today と同じ共有モーダル (outfit-detail-*) を開く
 */
function openWeeklyOutfitDetail() {
    const day = _wkDays[_wkSelectedDay];
    if (!day) return;
    const slot = day.slots[_wkSelectedSlot];
    if (!slot) return;

    const overlay = document.getElementById('outfit-detail-overlay');
    const modal = document.getElementById('outfit-detail-modal');
    const scrollContainer = document.getElementById('outfit-detail-scroll-container');
    if (!overlay || !modal) return;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Hero画像
    const heroEl = document.getElementById('detail-hero-img');
    const mainImg = document.getElementById('weekly-main-img');
    const heroUrl = (slot.scene_image && slot.scene_image.startsWith('http'))
        ? slot.scene_image
        : (mainImg ? mainImg.src : null);
    if (heroEl && heroUrl) {
        heroEl.src = heroUrl;
        heroEl.onerror = () => {
            heroEl.src = 'https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80&w=800';
            heroEl.onerror = null;
        };
    }

    // タイトル / 天気行
    set('detail-title', slot.outfit_name || '生成待ち');
    set('detail-weather-temp', (slot.feels_temp != null && slot.feels_temp !== '') ? `${slot.feels_temp}°` : '--°');

    const wInfo = (typeof getWeatherInfo === 'function' && slot.weather_code != null)
        ? getWeatherInfo(slot.weather_code)
        : { emoji: '🌤️', desc: slot.weather || '' };
    set('detail-weather-emoji', wInfo.emoji || '🌤️');
    set('detail-weather-desc', wInfo.desc || slot.weather || '');
    set('detail-time-label', _wkSlotTimeLabel(day, slot));
    set('detail-weather-precip', '0%');

    // Stylist's Note
    set('detail-desc', slot.one_point || '--');

    // Parts セクション（weekly にはデータなしなので非表示）
    const partsList = document.getElementById('detail-parts-list');
    const partsSection = document.getElementById('detail-outfit-section');
    if (partsList) partsList.innerHTML = '';
    if (partsSection) partsSection.style.display = 'none';

    // 表示アニメーション
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        if (scrollContainer) scrollContainer.scrollTop = 0;
    });
}

window.openWeeklyOutfitDetail = openWeeklyOutfitDetail;
window.selectWeeklyDay = selectWeeklyDay;
window.selectWeeklySlot = selectWeeklySlot;
window.loadWeekly = loadWeekly;
window.generateWeeklyAll = generateWeeklyAll;

// 初期化（sectionsLoaded 後に1回）
if (typeof window !== 'undefined') {
    window.addEventListener('sectionsLoaded', () => {
        loadWeekly();
    });
}
