// ===== プロフィール・今日のポイント編集 =====

let _profilePhotoPending = null;
let _saveTimeout = null;

// debouncedSaveProfile is defined later


// プロフィール編集フォームをLocalStorageから初期化
function initProfileEditFields() {
    const saved = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const nameInput = document.getElementById('profile-edit-name');
    const bioInput  = document.getElementById('profile-edit-bio');
    if (nameInput) nameInput.value = saved.name || 'Alessandro Riva';
    if (bioInput) {
        bioInput.value = saved.bio || '';
        const counter = document.getElementById('profile-bio-count');
        if (counter) counter.textContent = bioInput.value.length;
    }
    const handleInput = document.getElementById('profile-edit-handle');
    if (handleInput) handleInput.value = saved.handle || 'alessandro_riva';
    const birthY = document.getElementById('profile-edit-birth-y');
    const birthM = document.getElementById('profile-edit-birth-m');
    const birthD = document.getElementById('profile-edit-birth-d');
    
    if (birthY && birthM && birthD) {
        const b = saved.birthday;
        if (typeof b === 'object' && b !== null) {
            birthY.value = b.y || '';
            birthM.value = b.m || '';
            birthD.value = b.d || '';
        } else if (typeof b === 'string' && b.includes('-')) {
            // 旧データ (YYYY-MM-DD) の互換性
            const parts = b.split('-');
            birthY.value = parts[0] || '';
            birthM.value = parseInt(parts[1]) || '';
            birthD.value = parseInt(parts[2]) || '';
        }
    }
    setBirthdayVisibility(saved.birthday_visibility || 'private', false);

    const removeBtn = document.getElementById('profile-remove-photo-btn');
    if (removeBtn) {
        if (saved.photo) removeBtn.classList.remove('hidden');
        else removeBtn.classList.add('hidden');
    }

    // パーソナライズ項目の初期化
    const p = saved.personalize || {};
    
    // スライダー
    const tempInput = document.querySelector('input[oninput*="temp-label"]');
    if (tempInput && p.temp_sensitivity) {
        const labels = ['極度の寒がり','寒がり','普通','暑がり','極度の暑がり'];
        const idx = labels.indexOf(p.temp_sensitivity);
        if (idx !== -1) {
            tempInput.value = idx + 1;
            const tempLabel = document.getElementById('temp-label');
            if (tempLabel) tempLabel.innerText = p.temp_sensitivity;
        }
    }
    const rainInput = document.querySelector('input[oninput*="rain-label"]');
    if (rainInput && p.rain_sensitivity) {
        const labels = ['気にしない（デザイン重視）','普通','小雨でも防水優先'];
        const idx = labels.indexOf(p.rain_sensitivity);
        if (idx !== -1) {
            rainInput.value = idx + 1;
            const rainLabel = document.getElementById('rain-label');
            if (rainLabel) rainLabel.innerText = p.rain_sensitivity;
        }
    }

    // 単一選択ボタン群の復元
    const setGroupActive = (group, value) => {
        if (!value) return;
        const normalizedValue = String(value).trim();
        document.querySelectorAll(`.profile-opt-${group}`).forEach(btn => {
            // dataset.value, dataset.label, innerText のいずれかが一致すればアクティブにする
            if (btn.dataset.value === normalizedValue || btn.dataset.label === normalizedValue || btn.innerText.trim() === normalizedValue) {
                btn.dataset.active = 'true';
            } else {
                btn.dataset.active = 'false';
            }
        });
    };
    if (p.gender) setGroupActive('gender', p.gender);
    if (p.fit_upper) setGroupActive('fit-upper', p.fit_upper);
    if (p.fit_lower) setGroupActive('fit-lower', p.fit_lower);

    if (p.skeletal_type) setGroupActive('body-skeletal', p.skeletal_type);
    if (p.skin_tone) setGroupActive('skin-tone', p.skin_tone);

    if (p.face_shape) setGroupActive('face-shape', p.face_shape);
    if (p.body_gender) setGroupActive('body-gender', p.body_gender);
    if (p.hair_style) setGroupActive('hair-style', p.hair_style);
    if (p.hair_color) setGroupActive('hair-color', p.hair_color);
    if (p.body_type) setGroupActive('body-type', p.body_type);

    // 年代 (select) の初期化
    const ageSelect = document.getElementById('body-age');
    const ageValue = p.body_age || saved.body_age;
    if (ageSelect && ageValue) {
        ageSelect.value = ageValue;
    }

    // タグ類の初期化
    const recreateTags = (containerSelector, data, type) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        container.innerHTML = '';
        if (!data || !Array.isArray(data)) return;
        
        data.forEach(item => {
            const span = document.createElement('span');
            if (type === 'color') {
                span.className = 'profile-opt-color-pref-tag px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10 shadow-sm';
                span.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${item.color}; border: ${item.color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}"></span> ${item.name} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
            } else {
                let tagClass = 'px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10';
                if (type === 'material') {
                    tagClass = 'profile-opt-material-tag ' + tagClass;
                }
                if (type === 'inspiration') tagClass = 'profile-opt-inspiration-tag px-2.5 py-1 rounded-full bg-black/80 dark:bg-white/80 text-white dark:text-slate-900 font-bold text-[8px] flex items-center gap-1';
                
                span.className = tagClass;
                span.innerHTML = `${item} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
            }
            container.appendChild(span);
        });
    };

    // 身体データ（数値）の初期化
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };
    setVal('settings-height', saved.height);
    setVal('settings-weight', saved.weight);
    setVal('settings-shoulder', saved.shoulder);
    setVal('settings-chest', saved.chest);
    setVal('settings-neck', saved.neck);
    setVal('settings-sleeve', saved.sleeve);
    setVal('settings-belly', saved.belly);
    setVal('settings-waist', saved.waist);
    setVal('settings-hip', saved.hip);
    setVal('settings-inseam', saved.inseam);
    setVal('settings-thigh', saved.thigh);
    setVal('settings-shoes', saved.shoes);
    setVal('settings-wrist', saved.wrist);

    // 追加：タグ類の復元を実行
    recreateTags('.profile-opt-material-tag-container', p.materials, 'material');
    recreateTags('.profile-opt-inspiration-tag-container', p.inspirations, 'inspiration');
    recreateTags('#profile-favorite-colors-container', p.favorite_colors, 'color');
}

/**
 * プロフィールにタグを追加する (素材、インスピレーション、好きな色)
 */
// addProfileTag and removeProfileTag are defined later with custom modals


// ===== 設定モーダル =====
function openSettingsModal() {
    if(navigator.vibrate) navigator.vibrate([8]);
    const overlay = document.getElementById('settings-overlay');
    const modal   = document.getElementById('settings-modal');
    _profilePhotoPending = null;
    initProfileEditFields();

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        modal.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
    });
}

function closeSettingsModal() {
    const overlay = document.getElementById('settings-overlay');
    const modal   = document.getElementById('settings-modal');
    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }, 400);
}

// アコーディオン切り替え
function toggleSettingsAccordion(contentId, headerEl) {
    if (navigator.vibrate) navigator.vibrate([5]);
    const content = document.getElementById(contentId);
    const icon = headerEl.querySelector('.accordion-icon');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (icon) icon.textContent = 'expand_less';
    } else {
        content.classList.add('hidden');
        if (icon) icon.textContent = 'expand_more';
    }
}

// 身体データの自動補完
function autoFillBodyData() {
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    const height = parseFloat(document.getElementById('settings-height').value) || 170;
    const weight = parseFloat(document.getElementById('settings-weight').value) || 60;
    
    // 簡易的な平均算出モデル（身長と体重に依存）
    const isMale = document.querySelector('.profile-opt-body-gender[data-active="true"]')?.innerText !== '女性'; // 女性以外は男性寄りのベース使用
    const bodyType = document.querySelector('.profile-opt-body-type[data-active="true"]')?.innerText || '普通';
    
    // 基本の係数
    let factor = isMale ? 1.0 : 0.95;
    
    // 部位ごとの体型別補正用変数
    let shoulderMod = 1.0, chestMod = 1.0, waistMod = 1.0, hipMod = 1.0, thighMod = 1.0, bellyMod = 1.0, neckMod = 1.0, sleeveMod = 1.0, wristMod = 1.0;

    switch (bodyType) {
        case 'やせ型':
            shoulderMod = 0.95; chestMod = 0.90; waistMod = 0.90; hipMod = 0.90; thighMod = 0.90; bellyMod = 0.85;
            break;
        case '筋肉質':
            shoulderMod = 1.10; chestMod = 1.15; waistMod = 1.00; hipMod = 1.05; thighMod = 1.15; bellyMod = 1.00; neckMod = 1.10;
            break;
        case 'ぽっちゃり':
            shoulderMod = 1.05; chestMod = 1.10; waistMod = 1.20; hipMod = 1.15; thighMod = 1.10; bellyMod = 1.25; neckMod = 1.05;
            break;
        default: // 普通
            break;
    }

    // 骨格診断による補正
    const skeletalType = document.querySelector('.profile-opt-body-skeletal[data-active="true"]')?.innerText || 'わからない';
    switch (skeletalType) {
        case 'ストレート':
            chestMod *= 1.05; neckMod *= 1.05; thighMod *= 1.05; waistMod *= 1.02;
            break;
        case 'ウェーブ':
            shoulderMod *= 0.97; chestMod *= 0.95; neckMod *= 1.05; hipMod *= 1.05; thighMod *= 1.03;
            break;
        case 'ナチュラル':
            shoulderMod *= 1.08; chestMod *= 0.98; wristMod *= 1.10;
            break;
    }

    document.getElementById('settings-shoulder').value = Math.round((height * 0.25) * factor * shoulderMod);
    document.getElementById('settings-chest').value = Math.round((height * 0.45 + weight * 0.3) * factor * chestMod);
    document.getElementById('settings-neck').value = Math.round((height * 0.2) * factor * neckMod);
    document.getElementById('settings-sleeve').value = Math.round((height * 0.45) * factor * sleeveMod);
    document.getElementById('settings-belly').value = Math.round((height * 0.35 + weight * 0.4) * factor * bellyMod);
    
    document.getElementById('settings-waist').value = Math.round((height * 0.35 + weight * 0.35) * factor * waistMod);
    document.getElementById('settings-hip').value = Math.round((height * 0.45 + weight * 0.2) * factor * hipMod);
    document.getElementById('settings-inseam').value = Math.round(height * 0.46);
    document.getElementById('settings-thigh').value = Math.round(((weight * 0.6) * factor + 15) * thighMod);
    
    document.getElementById('settings-shoes').value = (Math.round(height * 0.15 * 2) / 2).toFixed(1);
    document.getElementById('settings-wrist').value = (Math.round((height * 0.08 + weight * 0.05) * factor * wristMod * 10) / 10).toFixed(1);
    
    console.log('[AutoFill] Calculated values:', {
        waist: document.getElementById('settings-waist').value,
        hip: document.getElementById('settings-hip').value,
        shoes: document.getElementById('settings-shoes').value
    });
    
    // UIのアニメーション効果（ハイライト）
    const inputs = document.querySelectorAll('#body-data-settings-content input[type="number"]');
    inputs.forEach(input => {
        if(input.id !== 'settings-height' && input.id !== 'settings-weight') {
            input.classList.add('ring-2', 'ring-primary', 'bg-primary/5');
            setTimeout(() => {
                input.classList.remove('ring-2', 'ring-primary', 'bg-primary/5');
            }, 1000);
        }
    });

    // 重要：計算が終わったら即座に保存して内部データを確定させる
    saveProfileEdit();
}

function setBirthdayVisibility(type, vibrate=true) {
    if(vibrate && navigator.vibrate) navigator.vibrate([8]);
    
    document.querySelectorAll('.birth-v-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'dark:text-white');
        btn.classList.add('text-on-surface-variant', 'dark:text-white/40');
        btn.setAttribute('data-active', 'false');
    });
    
    const activeBtn = document.getElementById(`birth-v-${type}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-on-surface-variant', 'dark:text-white/40');
        activeBtn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'dark:text-white');
        activeBtn.setAttribute('data-active', 'true');
    }
}

function handleProfilePhotoChange(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        _profilePhotoPending = e.target.result;
        // プロフィールページのアバターに即時プレビュー
        const img = document.getElementById('profile-avatar-img');
        const placeholder = document.getElementById('profile-avatar-placeholder');
        if (img) { img.src = _profilePhotoPending; img.classList.remove('hidden'); }
        if (placeholder) placeholder.classList.add('hidden');
        const removeBtn = document.getElementById('profile-remove-photo-btn');
        if (removeBtn) removeBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeProfilePhoto() {
    _profilePhotoPending = '__remove__';
    const img = document.getElementById('profile-avatar-img');
    const placeholder = document.getElementById('profile-avatar-placeholder');
    if (img) img.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    const removeBtn = document.getElementById('profile-remove-photo-btn');
    if (removeBtn) removeBtn.classList.add('hidden');
    document.getElementById('profile-photo-input').value = '';
}

/**
 * プロフィール編集の保存と同期
 * スプレッドシート（GAS）への自動抽出を優先します
 */
function saveProfileEdit(e) {
    console.log('[Sync] Starting Spreadsheet sync...');
    try {
        const getVal = (id) => (document.getElementById('settings-' + id) || document.getElementById(id))?.value || '';
        
        const getActiveBtnInfo = (group) => {
            const btns = document.querySelectorAll(`.profile-opt-${group}`);
            for (let i = 0; i < btns.length; i++) {
                if (btns[i].dataset.active === 'true' || btns[i].getAttribute('data-active') === 'true') {
                    return {
                        value: btns[i].dataset.value || btns[i].innerText.trim(),
                        label: btns[i].dataset.label || btns[i].innerText.trim()
                    };
                }
            }
            return { value: '', label: '' };
        };

        const ageEl = document.getElementById('body-age');
        const saved = JSON.parse(localStorage.getItem('kion_profile') || '{}');
        
        // 基本情報
        saved.name = document.getElementById('profile-edit-name')?.value || saved.name || '';
        saved.handle = document.getElementById('profile-edit-handle')?.value?.replace(/^@/, '') || saved.handle || '';
        saved.bio = document.getElementById('profile-edit-bio')?.value || saved.bio || '';
        
        // 写真の更新
        if (_profilePhotoPending === '__remove__') {
            saved.photo = null;
        } else if (_profilePhotoPending) {
            saved.photo = _profilePhotoPending;
        }

        
        // 身体データ (Basic) — DOM が空の場合は既存の saved 値を維持する
        const genderInfo = getActiveBtnInfo('body-gender');
        if (genderInfo.value) {
            saved.body_gender = genderInfo.value;
            saved.body_gender_label = genderInfo.label;
        }
        const newAge = ageEl ? ageEl.value : '';
        if (newAge) {
            saved.body_age = newAge;
            saved.body_age_label = ageEl.options[ageEl.selectedIndex]?.text || '';
        }

        const fields = ['height','weight','shoulder','chest','neck','sleeve','belly','waist','hip','inseam','thigh','shoes','wrist'];
        fields.forEach(f => { const v = getVal(f); if (v) saved[f] = v; });

        // パーソナライズ (Personalize) - weather.js が参照する構造
        if (!saved.personalize) saved.personalize = {};

        // 感度設定
        saved.personalize.temp_sensitivity = document.getElementById('temp-label')?.innerText || saved.personalize.temp_sensitivity || '普通';
        saved.personalize.rain_sensitivity = document.getElementById('rain-label')?.innerText || saved.personalize.rain_sensitivity || '普通';

        // スタイル・体型属性 — DOM が空なら既存値を保持
        const _g = getActiveBtnInfo('gender').value || saved.body_gender;
        if (_g) saved.personalize.gender = _g;
        saved.personalize.body_gender = saved.body_gender;
        const _bt = getActiveBtnInfo('body-type').label; if (_bt) saved.personalize.body_type = _bt;
        const _sk = getActiveBtnInfo('body-skeletal').label; if (_sk) saved.personalize.skeletal_type = _sk;
        const _st = getActiveBtnInfo('skin-tone').value;  if (_st) saved.personalize.skin_tone = _st;
        const _fs = getActiveBtnInfo('face-shape').value; if (_fs) saved.personalize.face_shape = _fs;
        const _hs = getActiveBtnInfo('hair-style').value; if (_hs) saved.personalize.hair_style = _hs;
        const _hc = getActiveBtnInfo('hair-color').value; if (_hc) saved.personalize.hair_color = _hc;

        // タグデータの抽出
        const extractTags = (selector) => {
            return Array.from(document.querySelectorAll(selector)).map(el => {
                const clone = el.cloneNode(true);
                clone.querySelectorAll('.material-symbols-outlined').forEach(s => s.remove());
                return clone.textContent.trim();
            }).filter(x => x);
        };
        
        saved.personalize.materials = extractTags('.profile-opt-material-tag');
        saved.personalize.inspirations = extractTags('.profile-opt-inspiration-tag');
        
        // 好きな色はオブジェクト形式
        saved.personalize.favorite_colors = Array.from(document.querySelectorAll('.profile-opt-color-pref-tag')).map(el => {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('.material-symbols-outlined').forEach(s => s.remove());
            const colorDot = el.querySelector('span');
            return {
                name: clone.textContent.trim(),
                color: colorDot ? colorDot.style.backgroundColor : ''
            };
        });

        // LocalStorageに保存
        localStorage.setItem('kion_profile', JSON.stringify(saved));
        if (typeof applyProfileDisplay === 'function') applyProfileDisplay(saved);

        // Supabase にも同期保存
        if (typeof window.saveProfileToSupabase === 'function') {
            window.saveProfileToSupabase(saved).then(result => {
                if (result.success) {
                    console.log('[Profile] Synced to Supabase');
                } else {
                    console.warn('[Profile] Supabase sync failed:', result.error);
                }
            });
        }

        // クラウド同期
        // ハンドル変更時に古いシートをリネームできるよう previous_user_id を含める
        const __prevHandle = localStorage.getItem('kion_prev_handle');
        const __currentHandle = saved.handle || 'unknown';
        const syncData = {
            user_id: __currentHandle,
            previous_user_id: (__prevHandle && __prevHandle !== __currentHandle) ? __prevHandle : '',
            gender: saved.body_gender_label || '',
            age: saved.body_age_label || '',
            height: saved.height || '', 
            weight: saved.weight || '',
            body_type: saved.personalize.body_type || '',
            skeletal_type: saved.personalize.skeletal_type || '',
            shoulder: saved.shoulder || '', 
            chest: saved.chest || '', 
            neck: saved.neck || '', 
            sleeve: saved.sleeve || '',
            belly: saved.belly || '', 
            waist: saved.waist || '', 
            hip: saved.hip || '', 
            inseam: saved.inseam || '', 
            thigh: saved.thigh || '',
            shoes: saved.shoes || '', 
            wrist: saved.wrist || '',
            skin_tone: saved.personalize.skin_tone || '',
            face_shape: saved.personalize.face_shape || '',
            hair_style: saved.personalize.hair_style || '',
            hair_color: saved.personalize.hair_color || '',
            temp_sensitivity: saved.personalize.temp_sensitivity || '普通',
        };

        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(res => console.log('[Sync] Success:', res))
                .withFailureHandler(err => console.error('[Sync] Failure:', err))
                .syncProfileData(syncData);
        } else if (typeof WOW_CONFIG !== 'undefined' && WOW_CONFIG.cloudUrl) {
            // Fallback to fetch (Web App URL)
            fetch(WOW_CONFIG.cloudUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    apiKey: WOW_CONFIG.apiKey,
                    type: 'profile',
                    data: syncData
                })
            })
            .then(() => console.log('[Sync] Profile Sync triggered via fetch'))
            .catch(err => console.error('[Sync] Fetch failure:', err));
        }

        // 現在のハンドルを次回比較用に保存
        localStorage.setItem('kion_prev_handle', __currentHandle);

    } catch (err) {
        console.error('[Sync] Error during profile sync:', err);
    }
}

/**
 * 入力中の自動保存（内部用）
 */
function debouncedSaveProfile() {
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        saveProfileEdit();
    }, 500);
}

/**
 * ボタン選択時の処理
 */
function selectProfileOption(btn, group) {
    const btns = btn.parentElement.querySelectorAll(`.profile-opt-${group}`);
    btns.forEach(b => {
        b.dataset.active = 'false';
        b.setAttribute('data-active', 'false');
    });
    btn.dataset.active = 'true';
    btn.setAttribute('data-active', 'true');
    
    // デバウンスを介して保存
    debouncedSaveProfile();
}


// ===== 過去の投稿ギャラリー =====
let profilePostsFilter = 'all';

function renderMyPosts() {
    const grid = document.getElementById('profile-posts-grid');
    if (!grid) return;

    let posts = JSON.parse(localStorage.getItem('kion_my_posts') || '[]');
    
    // 初回モックデータ（データが空の場合のみ）
    if (posts.length === 0) {
        posts = [
            { id: 101, type: 'trend', text: 'ミラノでの春コーデ。リネンの質感が最高です。', temp: '16〜20°C', img: 'assets/images/rolex.png', date: new Date().toISOString() },
            { id: 102, type: 'qa', text: '雨の日のシルクシャツ、皆さんはどうケアしていますか？', temp: '21〜25°C', tags: ['素材ケア', '雨の日'], date: new Date().toISOString() },
            { id: 103, type: 'trend', text: '休日の公園散歩。動きやすさ重視のジャストフィット。', temp: '11〜15°C', img: 'assets/images/loafers.png', date: new Date().toISOString() }
        ];
        localStorage.setItem('kion_my_posts', JSON.stringify(posts));
    }

    const filtered = profilePostsFilter === 'all' ? posts : posts.filter(p => p.type === profilePostsFilter);
    grid.innerHTML = '';
    
    // ヘッダーの投稿数を更新 (実際の投稿数)
    const countEl = document.getElementById('profile-posts-count');
    if (countEl) countEl.textContent = posts.length;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-2 py-10 text-center opacity-40">
                <span class="material-symbols-outlined text-3xl">post_add</span>
                <p class="text-[10px] font-bold mt-1">投稿がありません</p>
            </div>`;
        return;
    }

    filtered.forEach(post => {
        const card = document.createElement('div');
        if (post.type === 'trend') {
            card.className = 'bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5 animate-[fadeSlideIn_0.3s_ease_forwards]';
            card.innerHTML = `
                <div class="relative aspect-[4/5]">
                    <img src="${post.img}" class="w-full h-full object-cover">
                    <div class="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold">Trend</div>
                </div>
                <div class="p-2">
                    <p class="text-[9px] dark:text-white font-bold line-clamp-2 leading-snug">${post.text}</p>
                    <div class="flex items-center gap-1 mt-1 opacity-60">
                        <span class="material-symbols-outlined text-[10px]">thermostat</span>
                        <span class="text-[8px] font-bold">${post.temp}</span>
                    </div>
                </div>`;
        } else {
            card.className = 'bg-primary/5 dark:bg-blue-500/5 rounded-2xl p-3 shadow-sm border border-primary/10 dark:border-blue-500/10 flex flex-col justify-between animate-[fadeSlideIn_0.3s_ease_forwards]';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-1 text-primary dark:text-blue-400">
                        <span class="text-[7px] font-bold px-1.5 py-0.5 bg-primary/10 dark:bg-blue-400/10 rounded-full">Q&A</span>
                        <span class="material-symbols-outlined text-xs">forum</span>
                    </div>
                    <p class="text-[9px] dark:text-white font-bold leading-normal">${post.text}</p>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                    ${(post.tags || []).slice(0, 2).map(t => `<span class="text-[7px] bg-white dark:bg-slate-700 px-1 py-0.5 rounded opacity-70 dark:text-white">#${t}</span>`).join('')}
                </div>`;
        }
        grid.appendChild(card);
    });
}

function filterProfilePosts(type) {
    if(navigator.vibrate) navigator.vibrate([8]);
    profilePostsFilter = type;
    
    // UI反映
    ['all', 'trend', 'qa'].forEach(t => {
        const btn = document.getElementById(`profile-posts-tab-${t}`);
        if(t === type) {
            btn.className = 'text-[10px] font-bold px-3 py-1 rounded-full bg-primary text-white shadow-sm transition-all';
        } else {
            btn.className = 'text-[10px] font-bold px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-on-surface-variant dark:text-white/60 transition-all';
        }
    });
    
    renderMyPosts();
}

// 愛用品の数をDOMから取得してヘッダーに反映
function updateSignatureCount() {
    const items = document.querySelectorAll('.signature-item');
    const countEl = document.getElementById('profile-signature-count');
    if (countEl) {
        countEl.textContent = items.length;
    }
}

// 初期化登録
window.addEventListener('sectionsLoaded', () => {
    renderMyPosts();
    updateSignatureCount();
    initFollowState();
});

function applyProfileDisplay(data) {
    const nameEl = document.getElementById('profile-display-name');
    if(nameEl) nameEl.textContent = data.name || 'Alessandro Riva';

    const handleEl = document.getElementById('profile-handle');
    if(handleEl) handleEl.textContent = '@' + (data.handle || 'alessandro_riva');

    const img         = document.getElementById('profile-avatar-img');
    const placeholder = document.getElementById('profile-avatar-placeholder');
    if(data.photo) {
        img.src = data.photo;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }

    const bioEl = document.getElementById('profile-bio-display');
    if(bioEl) {
        if(data.bio) {
            bioEl.textContent = data.bio;
            bioEl.classList.remove('hidden');
        } else {
            bioEl.classList.add('hidden');
        }
    }

    const birthEl = document.getElementById('profile-birthday-display');
    const birthText = document.getElementById('profile-birthday-text');
    if(birthEl && birthText) {
        const b = data.birthday;
        const isPublic = data.birthday_visibility === 'public'; // デフォルトは非公開

        if(b && isPublic) {
            let res = '';
            if (typeof b === 'object') {
                if(b.y) res += b.y + '年';
                if(b.m) res += b.m + '月';
                if(b.d) res += b.d + '日';
            } else if (typeof b === 'string' && b.includes('-')) {
                const parts = b.split('-');
                res = `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
            }

            if(res) {
                birthText.textContent = res;
                birthEl.classList.remove('hidden');
            } else {
                birthEl.classList.add('hidden');
            }
        } else {
            birthEl.classList.add('hidden');
        }
    }
}

// 文字数カウント
window.addEventListener('sectionsLoaded', () => {
    const bioInput = document.getElementById('profile-edit-bio');
    if(bioInput) bioInput.addEventListener('input', () => {
        document.getElementById('profile-bio-count').textContent = bioInput.value.length;
    });

});/**
 * プロフィールのタグを削除する
 */
function removeProfileTag(btn) {
    if(navigator.vibrate) navigator.vibrate([5]);
    const tag = btn.parentElement;
    if (tag) {
        tag.remove();
        debouncedSaveProfile();
    }
}


function addProfileTag(btn, type) {
    if(navigator.vibrate) navigator.vibrate([8]);
    let title = '';
    let className = '';
    let options = [];
    
    if(type === 'material') {
        title = '素材の好みを追加';
        options = WOW_CONSTANTS.PROFILE_OPTIONS.materials;
    } else if(type === 'inspiration') {
        title = 'インスピレーションを選択';
        className = 'px-3 py-1.5 rounded-full bg-black/80 dark:bg-white/80 text-white dark:text-slate-900 font-bold text-[10px] flex items-center gap-1 shadow-sm';
        options = WOW_CONSTANTS.PROFILE_OPTIONS.inspirations;
    } else if(type === 'brand') {
        title = 'レギュラーブランドを選択';
        className = 'px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-700 border border-black/5 dark:border-white/10 text-on-surface dark:text-white font-bold text-[10px] shadow-sm flex items-center gap-1';
        options = WOW_CONSTANTS.PROFILE_OPTIONS.brands;
    } else if(type === 'color-pref') {
        title = '好きな色を追加';
        options = WOW_CONSTANTS.PROFILE_OPTIONS.favoriteColors;
    }

    // カスタムモーダル作成
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity';
    
    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-slate-800 rounded-[28px] w-full max-w-[280px] p-6 shadow-2xl space-y-5 animate-[fadeSlideIn_0.2s_ease_forwards] border border-black/5 dark:border-white/10';
    
    const header = document.createElement('h3');
    header.className = 'font-headline font-bold text-sm dark:text-white text-center';
    header.textContent = title;
    
    const contentWrap = document.createElement('div');
    contentWrap.className = 'w-full max-h-[220px] overflow-y-auto bg-black/5 dark:bg-white/5 rounded-2xl p-1 custom-scrollbar space-y-1';
    
    options.forEach(opt => {
        const item = document.createElement('div');
        const isColorObj = typeof opt === 'object';
        const name = isColorObj ? opt.name : opt;
        const color = isColorObj ? opt.color : null;
        
        item.className = 'group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-primary/10 dark:hover:bg-blue-400/10 active:scale-[0.98]';
        
        let innerHTML = '';
        if (type === 'color-pref' && color) {
            innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${color}; border: ${color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}"></span>
                    <span class="text-[11px] font-bold dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">${name}</span>
                </div>
            `;
        } else {
            innerHTML = `<span class="text-[11px] font-bold dark:text-white group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">${name}</span>`;
        }
        
        innerHTML += `<span class="material-symbols-outlined text-transparent group-hover:text-primary dark:group-hover:text-blue-400 text-sm transition-colors">add_circle</span>`;
        item.innerHTML = innerHTML;
        
        item.onclick = () => {
            if(navigator.vibrate) navigator.vibrate([10]);
            const span = document.createElement('span');
            if (type === 'color-pref') {
                span.className = 'profile-opt-color-pref-tag px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10 shadow-sm';
                span.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${color}; border: ${color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}"></span> ${name} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
            } else {
                let tagClass = 'px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10';
                if (type === 'material') {
                    tagClass = 'profile-opt-material-tag ' + tagClass;
                }
                if (type === 'inspiration') {
                    tagClass = 'profile-opt-inspiration-tag px-2.5 py-1 rounded-full bg-black/80 dark:bg-white/80 text-white dark:text-slate-900 font-bold text-[8px] flex items-center gap-1';
                }
                if (type === 'brand') {
                    tagClass = 'profile-opt-brand-tag px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-700 border border-black/5 dark:border-white/10 text-on-surface dark:text-white font-bold text-[10px] shadow-sm flex items-center gap-1';
                }
                
                span.className = tagClass;
                span.innerHTML = `${name} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-70 hover:opacity-100">close</span>`;
            }
            const container = btn.closest('.space-y-3').querySelector('.flex-wrap');
            if (container) container.appendChild(span);
            overlay.remove();
            debouncedSaveProfile();
        };
        contentWrap.appendChild(item);
    });
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex gap-2 pt-1';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'flex-1 py-3 bg-black/5 dark:bg-white/10 rounded-2xl font-bold text-[11px] dark:text-white active:scale-95 transition-transform hover:bg-black/10 dark:hover:bg-white/20';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.onclick = () => overlay.remove();
    
    btnContainer.appendChild(cancelBtn);
    
    modal.appendChild(header);
    modal.appendChild(contentWrap);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// ===== フォロー機能 =====
const FOLLOW_STATE_KEY = 'kion_is_following_alessandro';

function initFollowState() {
    const isFollowing = localStorage.getItem(FOLLOW_STATE_KEY) === 'true';
    updateFollowUI(isFollowing, false); // 初期表示時はトーストを出さない
}

function toggleFollow() {
    if (navigator.vibrate) navigator.vibrate([10, 5, 20]);
    const isFollowing = localStorage.getItem(FOLLOW_STATE_KEY) === 'true';
    const newState = !isFollowing;
    
    localStorage.setItem(FOLLOW_STATE_KEY, newState);
    updateFollowUI(newState, true);
}

function updateFollowUI(isFollowing, showToast = true) {
    const btn = document.getElementById('profile-follow-btn');
    const countEl = document.getElementById('profile-follower-count');
    if (!btn || !countEl) return;

    // 現在のプロフィールが「自分」かどうかを判定 (将来的に ID 等で判定)
    // 今回はデモのため定数で判定しますが、他者プロフィールのシミュレーションも想定
    const isMe = true; 

    if (isMe) {
        // 本人の場合の表示
        btn.classList.add('following');
        btn.classList.remove('bg-primary', 'text-white');
        btn.innerHTML = `<span class="material-symbols-outlined text-[14px]">verified_user</span><span>本人です</span>`;
        btn.disabled = true; // 自分の場合はクリック不可
        btn.style.opacity = '0.9';
        btn.style.cursor = 'default';
        if (countEl) countEl.textContent = "1,200"; // 本人の場合は固定
        return;
    }

    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';

    const baseCount = 1200; // 元の数値
    const currentCount = isFollowing ? baseCount + 1 : baseCount;

    // ボタンの見た目更新
    if (isFollowing) {
        btn.classList.add('following');
        btn.classList.remove('bg-primary', 'text-white');
        btn.innerHTML = `<span class="material-symbols-outlined text-[14px]">person_check</span><span>フォロー中</span>`;
    } else {
        btn.classList.remove('following');
        btn.classList.add('bg-primary', 'text-white');
        btn.innerHTML = `<span class="material-symbols-outlined text-[14px]">person_add</span><span>フォローする</span>`;
    }

    // カウント更新
    countEl.textContent = currentCount.toLocaleString();

    if (showToast) {
        alert(isFollowing ? 'Alessandro Riva をフォローしました ✨' : 'フォローを解除しました');
    }
}


// --- Extraction related code removed by user request ---


