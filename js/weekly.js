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
    if (labelEl) labelEl.textContent = `${day.day_label}曜${slot.slot_label}`;
    const tempEl = document.getElementById('weekly-main-temp');
    if (tempEl) tempEl.textContent = (slot.feels_temp != null && slot.feels_temp !== '') ? `${slot.feels_temp}°` : '--°';
    const nameEl = document.getElementById('weekly-main-name');
    if (nameEl) nameEl.textContent = slot.outfit_name || '生成待ち';
    const tipEl = document.getElementById('weekly-main-tip');
    if (tipEl) tipEl.textContent = slot.one_point || `${day.day_label}曜${slot.slot_label}のコーデをここに表示`;
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
        if (labelEl) labelEl.textContent = `${day.day_label}曜${slot.slot_label}`;
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

// グローバル公開
window.selectWeeklyDay = selectWeeklyDay;
window.selectWeeklySlot = selectWeeklySlot;
window.loadWeekly = loadWeekly;

// 初期化（sectionsLoaded 後に1回）
if (typeof window !== 'undefined') {
    window.addEventListener('sectionsLoaded', () => {
        loadWeekly();
    });
}
