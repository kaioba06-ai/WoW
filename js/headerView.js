// index.html 上部の天気バー (MAX/MIN・絵文字・説明・傘・前日比) を更新する DOM ビュー。
// 元は js/weather.js の updateCurrentWeather() に同居。Logic Engine の責務外なので分離。
// 依存: getCustomDynamicWeather (weather.js)

function updateCurrentWeather(data) {
    const weatherInfo = getCustomDynamicWeather(data);

    const maxApparent = Math.round(data.daily.apparent_temperature_max[1] || data.daily.apparent_temperature_max[0]);
    const minApparent = Math.round(data.daily.apparent_temperature_min[1] || data.daily.apparent_temperature_min[0]);

    const apparentMaxEl = document.getElementById('apparent-max-temp');
    if (apparentMaxEl) apparentMaxEl.textContent = `${maxApparent}°`;
    const apparentMinEl = document.getElementById('apparent-min-temp');
    if (apparentMinEl) apparentMinEl.textContent = `${minApparent}°`;
    const emojiEl = document.getElementById('weather-emoji');
    if (emojiEl) emojiEl.textContent = weatherInfo.emoji;
    const descEl = document.getElementById('weather-desc');
    if (descEl) descEl.textContent = weatherInfo.desc;

    const nowHour = new Date().getHours();
    const hourlyProb = data.hourly.precipitation_probability || [];
    const todayIndex = data.hourly.time.findIndex(t => {
        const d = new Date(t);
        return d.getDate() === new Date().getDate() && d.getHours() === nowHour;
    });
    if (todayIndex >= 0) {
        const upcoming = hourlyProb.slice(todayIndex, todayIndex + 6);
        const maxProb = Math.max(...upcoming);
        if (maxProb >= 40) {
            const umbrella = document.getElementById('umbrella-icon');
            if (umbrella) {
                umbrella.style.display = '';
                umbrella.title = `降水確率 ${maxProb}%`;
            }
        }
    }

    const dailyMax = data.daily.temperature_2m_max;
    if (dailyMax.length >= 2) {
        const yesterdayMax = Math.round(dailyMax[0]);
        const todayMax = Math.round(dailyMax[1]);
        const diff = todayMax - yesterdayMax;
        const badge = document.getElementById('temp-diff-badge');
        const diffText = document.getElementById('temp-diff-text');

        if (badge) {
            if (diff > 0) {
                badge.style.display = 'flex';
                badge.className = 'flex items-center gap-1.5 text-[10px] font-bold bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-500/20 w-max';
                const iconEl = badge.querySelector('.material-symbols-outlined');
                if (iconEl) iconEl.textContent = 'trending_up';
                if (diffText) diffText.textContent = `昨日より +${diff}°C`;
            } else if (diff < 0) {
                badge.style.display = 'flex';
                badge.className = 'flex items-center gap-1.5 text-[10px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 w-max';
                const iconEl2 = badge.querySelector('.material-symbols-outlined');
                if (iconEl2) iconEl2.textContent = 'trending_down';
                if (diffText) diffText.textContent = `昨日より ${diff}°C`;
            } else {
                badge.style.display = 'none';
            }
        }
    }
}
