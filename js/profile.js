// ===== プロフィール・今日のポイント編集 =====

let _profilePhotoPending = null;
let _saveTimeout = null;

function debouncedSaveProfile() {
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        saveProfileEdit();
    }, 500);
}

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
    if (p.personal_color) setGroupActive('color', p.personal_color);
    if (p.fit_upper) setGroupActive('fit-upper', p.fit_upper);
    if (p.fit_lower) setGroupActive('fit-lower', p.fit_lower);
    if (p.budget) setGroupActive('budget', p.budget);

    if (p.skeletal_type) setGroupActive('body-skeletal', p.skeletal_type);
    if (p.skin_tone) setGroupActive('skin-tone', p.skin_tone);
    if (p.lineage) setGroupActive('roots', p.lineage);
    if (p.face_shape) setGroupActive('face-shape', p.face_shape);
    if (p.body_gender) setGroupActive('body-gender', p.body_gender);
    if (p.body_age) setGroupActive('body-age', p.body_age);
    if (p.hair_style) setGroupActive('hair-style', p.hair_style);
    if (p.hair_color) setGroupActive('hair-color', p.hair_color);
    if (p.eye_color) setGroupActive('eye-color', p.eye_color); // 新項目
    if (p.body_type) setGroupActive('body-type', p.body_type);

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

    recreateTags('.profile-opt-material-tag-container', p.materials, 'material'); // Note: added container classes in profile.html
    recreateTags('.profile-opt-inspiration-tag-container', p.inspirations, 'inspiration');
    recreateTags('#profile-favorite-colors-container', p.favorite_colors, 'color');

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
}

/**
 * プロフィールにタグを追加する (素材、インスピレーション、好きな色)
 */
function addProfileTag(btn, type) {
    let value = '';
    let color = '#888888';

    if (type === 'color-pref') {
        value = prompt('好きな色の名前を入力してください (例: ネイビー)');
        if (!value) return;
        color = prompt('色のカラーコードを入力してください (例: #000080)', '#000080');
        if (!color) color = '#888888';
    } else {
        const typeLabel = type === 'material' ? '好みの素材' : 'インスピレーション';
        value = prompt(`${typeLabel}を入力してください (例: ${type === 'material' ? 'リネン' : 'ストリート'})`);
        if (!value) return;
    }

    const containerSelector = type === 'color-pref' ? '#profile-favorite-colors-container' : 
                             (type === 'material' ? '.profile-opt-material-tag-container' : '.profile-opt-inspiration-tag-container');
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const span = document.createElement('span');
    if (type === 'color-pref') {
        span.className = 'profile-opt-color-pref-tag px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10 shadow-sm';
        span.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${color}; border: ${color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}"></span> ${value} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
    } else {
        let tagClass = 'px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 text-on-surface dark:text-white font-bold text-[8px] flex items-center gap-1 border border-black/5 dark:border-white/10';
        if (type === 'material') tagClass = 'profile-opt-material-tag ' + tagClass;
        if (type === 'inspiration') tagClass = 'profile-opt-inspiration-tag px-2.5 py-1 rounded-full bg-black/80 dark:bg-white/80 text-white dark:text-slate-900 font-bold text-[8px] flex items-center gap-1';
        
        span.className = tagClass;
        span.innerHTML = `${value} <span onclick="removeProfileTag(this)" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
    }
    container.appendChild(span);
    saveProfileEdit(); // 追加後に保存
}

/**
 * プロフィールのタグを削除する
 */
function removeProfileTag(el) {
    const tag = el.parentElement;
    tag.remove();
    saveProfileEdit(); // 削除後に保存
}

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

function saveProfileEdit(e) {
    try {
        const saved = JSON.parse(localStorage.getItem('kion_profile') || '{}');
        const nameInput = document.getElementById('profile-edit-name');
        const handleInput = document.getElementById('profile-edit-handle');
        const bioInput = document.getElementById('profile-edit-bio');
        
        const name  = nameInput ? nameInput.value.trim() : (saved.name || 'Alessandro Riva');
        const handle = handleInput ? handleInput.value.trim().replace(/^@/, '') : (saved.handle || 'alessandro_riva');
        const bio   = bioInput ? bioInput.value.trim() : (saved.bio || '');

        const birthY = document.getElementById('profile-edit-birth-y')?.value || '';
        const birthM = document.getElementById('profile-edit-birth-m')?.value || '';
        const birthD = document.getElementById('profile-edit-birth-d')?.value || '';
        const birthday = { y: birthY, m: birthM, d: birthD };

        // 値とラベルの両方を取得するヘルパー
        const getSelected = (group) => {
            const btn = document.querySelector(`.profile-opt-${group}[data-active="true"]`);
            if (!btn) return { value: '', label: '' };
            return {
                value: btn.dataset.value || btn.innerText.trim(),
                label: btn.dataset.label || btn.innerText.trim()
            };
        };

        const birthdayVisibility = document.querySelector('.birth-v-btn[data-active="true"]')?.id.replace('birth-v-', '') || 'public';

        // パーソナライズ項目を収集
        const personalize = {
            // 内部的には value (ID) を優先保存するが、後でエクスポート時に label を使う
            gender: getSelected('gender').value,
            gender_label: getSelected('gender').label,
            temp_sensitivity: document.getElementById('temp-label')?.innerText?.trim() || '普通',
            rain_sensitivity: document.getElementById('rain-label')?.innerText?.trim() || '普通',
            personal_color: getSelected('color').value,
            personal_color_label: getSelected('color').label,
            fit_upper: getSelected('fit-upper').value,
            fit_upper_label: getSelected('fit-upper').label,
            fit_lower: getSelected('fit-lower').value,
            fit_lower_label: getSelected('fit-lower').label,
            budget: getSelected('budget').value,
            budget_label: getSelected('budget').label,

            skeletal_type: getSelected('body-skeletal').value,
            skeletal_type_label: getSelected('body-skeletal').label,
            skin_tone: getSelected('skin-tone').value,
            skin_tone_label: getSelected('skin-tone').label,
            lineage: getSelected('roots').value,
            lineage_label: getSelected('roots').label,
            face_shape: getSelected('face-shape').value,
            face_shape_label: getSelected('face-shape').label,
            body_gender: getSelected('body-gender').value,
            body_gender_label: getSelected('body-gender').label,
            body_type: getSelected('body-type').value,
            body_type_label: getSelected('body-type').label,
            body_age: getSelected('body-age').value,
            body_age_label: getSelected('body-age').label,
            hair_style: getSelected('hair-style').value,
            hair_style_label: getSelected('hair-style').label,
            hair_color: getSelected('hair-color').value,
            hair_color_label: getSelected('hair-color').label,
            eye_color: getSelected('eye-color').value,
            eye_color_label: getSelected('eye-color').label,
            // タグ類
            scene_tags: Array.from(document.querySelectorAll('.profile-opt-scenes[data-active="true"]')).map(t => t.innerText.trim()),
            materials: Array.from(document.querySelectorAll('.profile-opt-material-tag')).map(t => t.innerText.replace('close', '').trim()),
            inspirations: Array.from(document.querySelectorAll('.profile-opt-inspiration-tag')).map(t => t.innerText.replace('close', '').trim()),
            favorite_colors: Array.from(document.querySelectorAll('.profile-opt-color-pref-tag')).map(t => ({
                name: t.innerText.replace('close', '').trim(),
                color: t.querySelector('.rounded-full')?.style.backgroundColor
            }))
        };

        if(_profilePhotoPending === '__remove__') {
            saved.photo = null;
        } else if(_profilePhotoPending) {
            saved.photo = _profilePhotoPending;
        }
        saved.name = name;
        saved.handle = handle;
        saved.bio  = bio;
        saved.birthday = birthday;
        saved.birthday_visibility = birthdayVisibility;
        saved.personalize = personalize;

        // 身体データを保存対象に追加（数値として確実に取得）
        const getNum = (id) => document.getElementById(id)?.value || '';
        saved.height = getNum('settings-height');
        saved.weight = getNum('settings-weight');
        saved.shoulder = getNum('settings-shoulder');
        saved.chest = getNum('settings-chest');
        saved.neck = getNum('settings-neck');
        saved.sleeve = getNum('settings-sleeve');
        saved.belly = getNum('settings-belly');
        saved.waist = getNum('settings-waist');
        saved.hip = getNum('settings-hip');
        saved.inseam = getNum('settings-inseam');
        saved.thigh = getNum('settings-thigh');
        saved.shoes = getNum('settings-shoes');
        saved.wrist = getNum('settings-wrist');

        localStorage.setItem('kion_profile', JSON.stringify(saved));

        applyProfileDisplay(saved);
        _profilePhotoPending = null;

        // 保存された設定を即座に提案ロジックに反映させる
        if (typeof window.refreshWeatherUI === 'function') {
            window.refreshWeatherUI();
        }

        // 自動同期を実行 (クラウド設定がある場合のみ)
        if (typeof sendToCloud === 'function') {
            sendToCloud(true);
        }

        // 保存完了のフィードバック（必要に応じて）
        const eventObj = e || window.event;
        const btn = eventObj?.target || document.querySelector('button[onclick*="saveProfileEdit"]');
        if (btn && btn.id !== 'profile-edit-name' && btn.id !== 'profile-edit-handle') {
            // 自動保存の場合はメインのボタンにフィードバックを出す
            const saveBtn = document.querySelector('button[onclick*="saveProfileEdit"]');
            if (saveBtn) {
                const orig = saveBtn.textContent;
                if (!orig.includes('✓')) {
                    saveBtn.innerHTML = '<span class="material-symbols-outlined text-sm">done</span> 保存済み';
                    saveBtn.classList.add('bg-green-500', 'dark:bg-green-500');
                    saveBtn.classList.remove('bg-primary', 'dark:bg-blue-500');
                    setTimeout(() => {
                        saveBtn.textContent = '完了';
                        saveBtn.classList.remove('bg-green-500', 'dark:bg-green-500');
                        saveBtn.classList.add('bg-primary', 'dark:bg-blue-500');
                    }, 1200);
                }
            }
        }
    } catch (err) {
        console.error('[Profile] Save Error:', err);
    }
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

});



// ===== プロフィール: 選択トグル =====
function selectProfileOption(btn, group) {
    if(navigator.vibrate) navigator.vibrate([10]);
    document.querySelectorAll(`.profile-opt-${group}`).forEach(el => el.dataset.active = 'false');
    btn.dataset.active = 'true';
    
    // Auto-save on change
    saveProfileEdit();
}

function removeProfileTag(btn) {
    if(navigator.vibrate) navigator.vibrate([5]);
    btn.parentElement.remove();
    saveProfileEdit();
}

function addProfileTag(btn, type) {
    if(navigator.vibrate) navigator.vibrate([8]);
    let title = '';
    let className = '';
    let options = [];
    
    if(type === 'material') {
        title = '素材の好みを追加';
        options = ['コットン', 'リネン', 'シルク', 'カシミヤ', 'カーフスキン', 'スエード', 'デニム', 'ツイード', 'サテン', 'アクリル', 'ポリエステル', 'ナイロン', 'ウール', 'レーヨン', '麻', '本革', 'スウェット'];
    } else if(type === 'inspiration') {
        title = 'インスピレーションを選択';
        className = 'px-3 py-1.5 rounded-full bg-black/80 dark:bg-white/80 text-white dark:text-slate-900 font-bold text-[10px] flex items-center gap-1 shadow-sm';
        options = ['Steve McQueen', 'Audrey Hepburn', 'City Boy', 'Minimalist', 'K-Pop Style', 'French Chic', 'Quiet Luxury', 'Techwear'];
    } else if(type === 'brand') {
        title = 'レギュラーブランドを選択';
        className = 'px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-700 border border-black/5 dark:border-white/10 text-on-surface dark:text-white font-bold text-[10px] shadow-sm flex items-center gap-1';
        options = ['Ralph Lauren', 'Jil Sander', 'AURALEE', 'COMOLI', 'ZARA', 'H&M', 'Maison Margiela', 'Prada', 'GU', 'THE NORTH FACE'];
    } else if(type === 'color-pref') {
        title = '好きな色を追加';
        options = [
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
        ];
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
                span.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${color}; border: ${color === '#FFFFFF' ? '1px solid rgba(0,0,0,0.1)' : 'none'}"></span> ${name} <span onclick="this.parentElement.remove()" class="material-symbols-outlined text-[10px] cursor-pointer opacity-50 hover:opacity-100">close</span>`;
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
                span.innerHTML = `${name} <span onclick="this.parentElement.remove()" class="material-symbols-outlined text-[10px] cursor-pointer opacity-70 hover:opacity-100">close</span>`;
            }
            const container = btn.closest('.space-y-3').querySelector('.flex-wrap');
            if (container) container.appendChild(span);
            overlay.remove();
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

// ===== データ抽出 (Spreadsheet Export) =====

/**
 * 登録されているプロフィールデータ、身体データ、クローゼットデータを抽出
 */
function getFullExportData() {
    const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const closet = JSON.parse(localStorage.getItem('kion_closet_items') || '[]');
    const posts = JSON.parse(localStorage.getItem('kion_my_posts') || '[]');
    const p = profile.personalize || {};

    // AIアバター生成用のプロンプト変換マップ
    const map = {
        face: { 'oval': 'Oval', 'round': 'Round', 'oblong': 'Oblong', 'square': 'Square', 'heart': 'Heart' },
        gender: { 'male': 'man', 'female': 'woman', 'none': 'person' }
    };

    // 1. サーマルレベルの算出
    const labels = ['極度の寒がり','寒がり','普通','暑がり','極度の暑がり'];
    const sensitivityIdx = labels.indexOf(p.temp_sensitivity || '普通');
    const thermalLevel = (sensitivityIdx + 1) * 2; 

    // AI用英語ID
    const skinPrompt = p.skin_tone || 'natural'; 
    const stylePrompt = p.gender || 'unisex'; 
    const facePrompt = map.face[p.face_shape] || p.face_shape || 'oval';
    const fitUpPrompt = p.fit_upper || 'regular';
    const fitLowPrompt = p.fit_lower || 'regular';
    const genderPrompt = map.gender[p.body_gender] || p.body_gender || 'person';
    const agePrompt = p.body_age || '20s';
    const hairStylePrompt = p.hair_style || 'short';
    const hairColorPrompt = p.hair_color || 'black';
    const eyeColorPrompt = p.eye_color || 'black';

    return {
        timestamp: new Date().toLocaleString(),
        profile: {
            name: profile.name || 'Alessandro Riva',
            handle: profile.handle || 'alessandro_riva',
            bio: profile.bio || '',
            birthday: profile.birthday ? `${profile.birthday.y}/${profile.birthday.m}/${profile.birthday.d}` : '',
            visibility: profile.birthday_visibility || 'private'
        },
        personalize: {
            thermalLevel: thermalLevel,
            sensitivity: p.temp_sensitivity || '普通',
            rain_sensitivity: p.rain_sensitivity || '普通',
            gender_style: p.gender_label || 'こだわらない', // 日本語ラベル
            personal_color: p.personal_color_label || 'わからない', // 日本語ラベル
            fit_up: p.fit_upper_label || 'レギュラー', // 日本語ラベル
            fit_low: p.fit_lower_label || 'レギュラー', // 日本語ラベル
            budget: p.budget_label || 'ミックス', // 日本語ラベル
            materials: Array.isArray(p.materials) ? p.materials.join(', ') : (p.materials || ''),
            inspirations: Array.isArray(p.inspirations) ? p.inspirations.join(', ') : (p.inspirations || ''),
            favorite_colors: Array.isArray(p.favorite_colors) ? p.favorite_colors.map(c => typeof c === 'object' ? c.name : c).join(', ') : (p.favorite_colors || '')
        },
        body: {
            body_gender: p.body_gender_label || 'その他', // 日本語ラベル
            age: p.body_age_label || '20s',             // 日本語ラベル
            height: profile.height || '',
            weight: profile.weight || '',
            body_type: p.body_type_label || '普通',     // 日本語ラベル
            skeletal_type: p.skeletal_type_label || 'わからない', // 日本語ラベル
            skin_tone: p.skin_tone_label || 'Natural',   // 日本語ラベル
            lineage: p.lineage_label || 'その他',      // 日本語ラベル
            face_shape: p.face_shape_label || '卵型',   // 日本語ラベル
            hair_style: p.hair_style_label || 'ショート', // 日本語ラベル
            hair_color: p.hair_color_label || 'ブラック', // 日本語ラベル
            eye_color: p.eye_color_label || 'ブラック',   // 日本語ラベル
            shoulder: profile.shoulder || '',
            chest: profile.chest || '',
            neck: profile.neck || '',
            sleeve: profile.sleeve || '',
            belly: profile.belly || '',
            waist: profile.waist || '',
            hip: profile.hip || '',
            inseam: profile.inseam || '',
            thigh: profile.thigh || '',
            shoes: profile.shoes || '',
            wrist: profile.wrist || ''
        },
        closet_count: closet.length,
        closet_items: closet.map(item => ({
            name: item.name,
            category: item.category,
            color: item.colorName || item.color,
            addedAt: item.addedAt
        })),
        posts_count: posts.length,
        // AIアバター生成用の詳細プロンプト
        visual_parts: {
            skin: skinPrompt,
            heritage: p.lineage || 'Mixed heritage',
            face: facePrompt,
            gender: genderPrompt,
            style: stylePrompt,
            hair_style: hairStylePrompt,
            hair_color: hairColorPrompt,
            eye_color: eyeColorPrompt,
            fit_up: fitUpPrompt,
            fit_low: fitLowPrompt,
            full_prompt: `A ${skinPrompt} ${genderPrompt} of ${p.lineage || 'Mixed'} heritage, ${facePrompt} face, ${hairStylePrompt} ${hairColorPrompt} hair, ${eyeColorPrompt} eyes, wearing ${stylePrompt} style, ${fitUpPrompt} fit upper, ${fitLowPrompt} fit lower, backdrop in milano.`
        }
    };
}

/**
 * CSV形式で抽出（スプレッドシート用）
 */
function exportToSpreadsheet() {
    try {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        const data = getFullExportData();
        
        // CSVデータの構築 (縦型：キー, 値)
        const rows = [
            ['Category', 'Key', 'Value', 'Note'],
            ['Metadata', 'Export Time', data.timestamp, ''],
            ['Metadata', 'Status', data.status, ''],
            ['Profile', 'Name', data.profile.name, ''],
            ['Profile', 'ID', data.profile.handle, ''],
            ['Profile', 'Birthday', data.profile.birthday, ''],
            ['Personalize', 'Thermal Level', data.personalize.thermalLevel, '1-10 Scale'],
            ['Personalize', 'Sensitivity', data.personalize.sensitivity, ''],
            ['Personalize', 'Rain Sensitivity', data.personalize.rain_sensitivity, ''],
            ['Personalize', 'Gender Style', data.personalize.gender_style, ''],
            ['Personalize', 'Personal Color', data.personalize.personal_color, ''],
            ['Personalize', 'Skin Tone', data.personalize.skin_tone, ''],
            ['Body', 'Height', data.body.height, 'cm'],
            ['Body', 'Weight', data.body.weight, 'kg'],
            ['Body', 'Body Type', data.body.body_type, ''],
            ['Body', 'Skeletal Type', data.body.skeletal_type, ''],
            ['Body', 'Shoulder', data.body.shoulder, 'cm'],
            ['Body', 'Chest', data.body.chest, 'cm'],
            ['Body', 'Waist', data.body.waist, 'cm'],
            ['Body', 'Hip', data.body.hip, 'cm'],
            ['Body', 'Inseam', data.body.inseam, 'cm'],
            ['Body', 'Shoes', data.body.shoes, 'cm'],
            ['Closet', 'Total Items', data.closet_count, ''],
        ];

        // クローゼットアイテムも追加
        data.closet_items.forEach((item, i) => {
            rows.push(['ClosetItem', `Item ${i+1}`, item.name, `${item.category} / ${item.color}`]);
        });

        const csvContent = rows.map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        downloadFile(csvContent, 'csv', `WoW_Data_Export_${data.profile.handle}`);
        
        alert('CSVデータの抽出が完了しました 📊\nGoogleスプレッドシート等で開いてください。');
    } catch (err) {
        console.error('[Export] CSV Error:', err);
        alert('CSV抽出に失敗しました');
    }
}

/**
 * フラットなCSV形式で抽出（1行に全データを集約。大量データ管理用）
 */
function exportToFlatSpreadsheet() {
    try {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        const data = getFullExportData();
        
        const flatData = {
            '保存日時': data.timestamp,
            '名前': data.profile.name,
            'ハンドル名': data.profile.handle,
            '自己紹介': data.profile.bio,
            '誕生日': data.profile.birthday,
            // --- パーソナライズ ---
            '*スタイル傾向': data.personalize.gender_style,
            '気温感度': data.personalize.sensitivity,
            '耐熱レベル': data.personalize.thermalLevel,
            '雨感度': data.personalize.rain_sensitivity,
            '*パーソナルカラー': data.personalize.personal_color,
            '好きな色': (data.personalize.favorite_colors || []).map(c => c.name).join(', '),
            '*フィット感(上)': data.personalize.fit_up,
            '*フィット感(下)': data.personalize.fit_low,
            '好みの素材': (data.personalize.materials || []).join(', '),
            'インスピレーション': (data.personalize.inspirations || []).join(', '),
            '予算感': data.personalize.budget,
            // --- 身体データ ---
            '*身体性別': data.body.body_gender,
            '年代': data.body.age,
            '身長': data.body.height,
            '体重': data.body.weight,
            '体格': data.body.body_type,
            '骨格タイプ': data.body.skeletal_type,
            '*肌の色': data.body.skin_tone,
            '*ルーツ': data.body.lineage,
            '*顔型': data.body.face_shape,
            '髪型': data.body.hair_style,
            '髪色': data.body.hair_color,
            '目の色': data.body.eye_color,
            '肩幅': data.body.shoulder,
            '胸囲': data.body.chest,
            '首回り': data.body.neck,
            '裄丈': data.body.sleeve,
            '腹囲': data.body.belly,
            'ウエスト': data.body.waist,
            'ヒップ': data.body.hip,
            '股下': data.body.inseam,
            '太もも': data.body.thigh,
            '靴サイズ': data.body.shoes,
            '手首周り': data.body.wrist,
            'クローゼット数': data.closet_count,
            '投稿数': data.posts_count
        };

        const headers = Object.keys(flatData);
        const values = Object.values(flatData).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`);
        
        const csvContent = headers.join(',') + '\n' + values.join(',');
        downloadFile(csvContent, 'csv', `WoW_Flat_Data_${data.profile.handle}`);
        
        alert('フラットCSVデータの抽出が完了しました 📈\n1行に全てのデータが集約されています。');
    } catch (err) {
        console.error('[Export] Flat CSV Error:', err);
        alert('フラットCSV抽出に失敗しました');
    }
}

/**
 * クラウド（Googleスプレッドシート）へ直接送信
 * @param {boolean} isSilent - 自動同期の場合はアラートを出さない
 */
async function sendToCloud(isSilent = false) {
    // 【自動クリーンアップ】WOW_CONFIGがある場合、古いlocalStorageの設定を掃除して自動移行させる
    if (typeof WOW_CONFIG !== 'undefined') {
        if (localStorage.getItem('kion_cloud_url')) localStorage.removeItem('kion_cloud_url');
        if (localStorage.getItem('kion_cloud_api_key')) localStorage.removeItem('kion_cloud_api_key');
    }

    // 優先順位: 1. 手動設定(localStorage) 2. 自動設定(WOW_CONFIG)
    const endpoint = localStorage.getItem('kion_cloud_url') || (typeof WOW_CONFIG !== 'undefined' ? WOW_CONFIG.cloudUrl : '');
    const apiKey = localStorage.getItem('kion_cloud_api_key') || (typeof WOW_CONFIG !== 'undefined' ? WOW_CONFIG.apiKey : '');

    if (!endpoint) {
        if (!isSilent) {
            const url = prompt('Google Apps Script の「ウェブアプリURL」を入力してください：');
            if (url) localStorage.setItem('kion_cloud_url', url);
        }
        return;
    }
    
    if (!apiKey && !isSilent) {
        const key = prompt('APIキー（スプレッドシート側で設定したもの）を入力してください：');
        if (key) localStorage.setItem('kion_cloud_api_key', key);
    }

    try {
        const data = getFullExportData();
        data.apiKey = apiKey; // APIキーをデータに含める
        
        // 視覚的なフィードバック（ボタンの状態更新）
        const cloudBtn = document.getElementById('cloud-sync-btn-label');
        if (cloudBtn) cloudBtn.textContent = '同期中...';

        await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        setTimeout(() => {
            if (cloudBtn) cloudBtn.textContent = '同期済み';
            if (!isSilent) {
                if (navigator.vibrate) navigator.vibrate([5, 5, 50]);
                alert('クラウドとの同期が完了しました！☁️');
            }
            if (cloudBtn) setTimeout(() => cloudBtn.textContent = 'クラウドへ同期 (Direct)', 3000);
        }, 1000);

    } catch (err) {
        console.error('[Cloud] Auto-Sync Error:', err);
        if (!isSilent) alert('クラウド同期に失敗しました。');
    }
}

/**
 * クラウド送信先のURLをリセット
 */
function resetCloudUrl() {
    const newUrl = prompt('新しい Google Apps Script URL を入力してください：', localStorage.getItem('kion_cloud_url') || '');
    if (newUrl !== null) {
        localStorage.setItem('kion_cloud_url', newUrl);
    }
    const newKey = prompt('新しい APIキー を入力してください：', localStorage.getItem('kion_cloud_api_key') || '');
    if (newKey !== null) {
        localStorage.setItem('kion_cloud_api_key', newKey);
        alert('クラウド設定を更新しました。');
    }
}

/**
 * JSON形式で抽出（開発・バックアップ用）
 */
function exportToJSON() {
    try {
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        const data = getFullExportData();
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, 'json', `WoW_Data_Backup_${data.profile.handle}`);
        alert('JSONデータの抽出が完了しました 💾');
    } catch (err) {
        console.error('[Export] JSON Error:', err);
        alert('JSON抽出に失敗しました');
    }
}

/**
 * ファイルダウンロードのヘルパー
 */
function downloadFile(content, extension, filenameBase) {
    const mimeTypes = {
        'csv': 'text/csv;charset=utf-8;',
        'json': 'application/json;charset=utf-8;'
    };
    const prefix = extension === 'csv' ? '\ufeff' : ''; // BOM for Excel
    const blob = new Blob([prefix + content], { type: mimeTypes[extension] });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenameBase}_${timestamp}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

