// ===== プロフィール・今日のポイント編集 =====

let _profilePhotoPending = null;

function openProfileEditModal() {
    if(navigator.vibrate) navigator.vibrate([8]);
    const overlay = document.getElementById('profile-edit-overlay');
    const modal   = document.getElementById('profile-edit-modal');
    _profilePhotoPending = null;

    const saved = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    document.getElementById('profile-edit-name').value = saved.name || 'Alessandro Riva';
    const bioInput = document.getElementById('profile-edit-bio');
    bioInput.value = saved.bio || '';
    document.getElementById('profile-bio-count').textContent = bioInput.value.length;

    if(saved.photo) {
        document.getElementById('profile-edit-preview-img').src = saved.photo;
        document.getElementById('profile-edit-preview-img').classList.remove('hidden');
        document.getElementById('profile-edit-preview-placeholder').classList.add('hidden');
        document.getElementById('profile-remove-photo-btn').classList.remove('hidden');
    } else {
        document.getElementById('profile-edit-preview-img').classList.add('hidden');
        document.getElementById('profile-edit-preview-placeholder').classList.remove('hidden');
        document.getElementById('profile-remove-photo-btn').classList.add('hidden');
    }

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        modal.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
    });
}

function closeProfileEditModal() {
    const overlay = document.getElementById('profile-edit-overlay');
    const modal   = document.getElementById('profile-edit-modal');
    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
        document.getElementById('profile-photo-input').value = '';
        _profilePhotoPending = null;
    }, 350);
}

function handleProfilePhotoChange(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        _profilePhotoPending = e.target.result;
        document.getElementById('profile-edit-preview-img').src = _profilePhotoPending;
        document.getElementById('profile-edit-preview-img').classList.remove('hidden');
        document.getElementById('profile-edit-preview-placeholder').classList.add('hidden');
        document.getElementById('profile-remove-photo-btn').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeProfilePhoto() {
    _profilePhotoPending = '__remove__';
    document.getElementById('profile-edit-preview-img').classList.add('hidden');
    document.getElementById('profile-edit-preview-placeholder').classList.remove('hidden');
    document.getElementById('profile-remove-photo-btn').classList.add('hidden');
    document.getElementById('profile-photo-input').value = '';
}

function saveProfileEdit() {
    const saved = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    const name  = document.getElementById('profile-edit-name').value.trim() || 'Alessandro Riva';
    const bio   = document.getElementById('profile-edit-bio').value.trim();

    if(_profilePhotoPending === '__remove__') {
        saved.photo = null;
    } else if(_profilePhotoPending) {
        saved.photo = _profilePhotoPending;
    }
    saved.name = name;
    saved.bio  = bio;
    localStorage.setItem('kion_profile', JSON.stringify(saved));

    applyProfileDisplay(saved);
    closeProfileEditModal();
    alert('プロフィールを保存しました');
}

function applyProfileDisplay(data) {
    const nameEl = document.getElementById('profile-display-name');
    if(nameEl) nameEl.textContent = data.name || 'Alessandro Riva';

    const img         = document.getElementById('profile-avatar-img');
    const placeholder = document.getElementById('profile-avatar-placeholder');
    if(img && placeholder) {
        if(data.photo) {
            img.src = data.photo;
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            img.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
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
}

// ===== 初期化エントリポイント =====
// DOMContentLoaded は dynamic injection 後には発火しないため initProfile() を使う
let _profileInitialized = false;

function initProfile() {
    if (_profileInitialized) return;
    _profileInitialized = true;

    // 文字数カウント
    const bioInput = document.getElementById('profile-edit-bio');
    if(bioInput) bioInput.addEventListener('input', () => {
        const counter = document.getElementById('profile-bio-count');
        if(counter) counter.textContent = bioInput.value.length;
    });
    const tipSummaryInput = document.getElementById('tip-edit-summary');
    if(tipSummaryInput) tipSummaryInput.addEventListener('input', () => {
        const counter = document.getElementById('tip-summary-count');
        if(counter) counter.textContent = tipSummaryInput.value.length;
    });

    // 保存済みデータを即時反映
    const savedProfile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
    if(savedProfile.name || savedProfile.bio || savedProfile.photo) applyProfileDisplay(savedProfile);

    const savedTip = JSON.parse(localStorage.getItem('kion_tips') || '{}');
    if(savedTip.summary || savedTip.bullet1 || savedTip.bullet2) applyTipDisplay(savedTip);
}

// ===== 今日のポイント: 編集 =====
const TIP_DEFAULTS = {
    summary: 'メイン活動は「大学からバイトへ直行」。\n脱ぎ着しやすい薄手の重ね着が必須！',
    bullet1: '屋内と外の温度差にはシワになりにくい羽織り',
    bullet2: 'バイト先に備えて足元はスニーカー',
};

function openTipEditModal() {
    if(navigator.vibrate) navigator.vibrate([8]);
    const saved = JSON.parse(localStorage.getItem('kion_tips') || '{}');
    const summaryInput = document.getElementById('tip-edit-summary');
    summaryInput.value = saved.summary || TIP_DEFAULTS.summary;
    document.getElementById('tip-edit-bullet1').value = saved.bullet1 || TIP_DEFAULTS.bullet1;
    document.getElementById('tip-edit-bullet2').value = saved.bullet2 || TIP_DEFAULTS.bullet2;
    document.getElementById('tip-summary-count').textContent = summaryInput.value.length;

    const overlay = document.getElementById('tip-edit-overlay');
    const modal   = document.getElementById('tip-edit-modal');
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateX(-50%) translateY(0)';
        modal.style.transition = 'transform 0.35s cubic-bezier(0.32,0.72,0,1)';
    });
}

function closeTipEditModal() {
    const overlay = document.getElementById('tip-edit-overlay');
    const modal   = document.getElementById('tip-edit-modal');
    overlay.style.opacity = '0';
    modal.style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }, 350);
}

function saveTipEdit() {
    const data = {
        summary: document.getElementById('tip-edit-summary').value.trim() || TIP_DEFAULTS.summary,
        bullet1: document.getElementById('tip-edit-bullet1').value.trim() || TIP_DEFAULTS.bullet1,
        bullet2: document.getElementById('tip-edit-bullet2').value.trim() || TIP_DEFAULTS.bullet2,
    };
    localStorage.setItem('kion_tips', JSON.stringify(data));
    applyTipDisplay(data);
    closeTipEditModal();
    alert('今日のポイントを保存しました');
}

function resetTipEdit() {
    localStorage.removeItem('kion_tips');
    applyTipDisplay(TIP_DEFAULTS);
    closeTipEditModal();
    alert('デフォルトに戻しました');
}

function applyTipDisplay(data) {
    const summaryEl = document.getElementById('tip-summary-span');
    if(summaryEl) summaryEl.textContent = data.summary || TIP_DEFAULTS.summary;

    const b1 = document.getElementById('tip-bullet-1-text');
    if(b1) b1.textContent = ' ' + (data.bullet1 || TIP_DEFAULTS.bullet1);

    const b2 = document.getElementById('tip-bullet-2-text');
    if(b2) b2.textContent = ' ' + (data.bullet2 || TIP_DEFAULTS.bullet2);
}

// ===== プロフィール: 選択トグル =====
function selectProfileOption(btn, group) {
    if(navigator.vibrate) navigator.vibrate([8]);
    document.querySelectorAll(`.profile-opt-${group}`).forEach(b => {
        b.classList.remove('bg-primary','dark:bg-blue-500','text-white');
        b.classList.add('bg-white/50','dark:bg-slate-700','dark:text-white');
        b.dataset.active = 'false';
    });
    btn.classList.add('bg-primary','text-white');
    btn.classList.remove('bg-white/50','dark:bg-slate-700','dark:text-white');
    btn.dataset.active = 'true';
    alert(`「${btn.textContent.trim()}」に設定しました`);
}
