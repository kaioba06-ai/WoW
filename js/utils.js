/**
 * Wow Project Utilities
 */
window.WowUtils = {
    /**
     * Toggle password visibility
     */
    togglePassword: function(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (!input || !btn) return;
        const icon = btn.querySelector('.material-symbols-outlined');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            if (icon) icon.textContent = 'visibility_off';
        }
    },

    /**
     * Shake element to indicate error
     */
    shakeElement: function(el) {
        if (!el) return;
        el.classList.add('shake-err');
        setTimeout(() => el.classList.remove('shake-err'), 600);
    },

    /**
     * Shake input field by ID
     */
    shakeField: function(inputId) {
        const el = document.getElementById(inputId);
        this.shakeElement(el);
    },

    /**
     * Show/hide error message by ID
     */
    showError: function(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    },

    /**
     * Haptic feedback wrapper
     */
    vibrate: function(pattern = [10]) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    },

    /**
     * Toast notification
     */
    showToast: function(msg) {
        this.vibrate([15]);
        const t = document.createElement('div');
        t.className = `toast-notif fixed bottom-32 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-full shadow-2xl z-[100] text-[12px] font-bold flex items-center gap-2 whitespace-nowrap border border-white/10`;
        t.innerHTML = `<span class="material-symbols-outlined text-[16px]">info</span> ${msg}`;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

// Aliases for backward compatibility or ease of use
window.togglePassword = window.WowUtils.togglePassword;
window.shakeField = window.WowUtils.shakeField;
window.showError = window.WowUtils.showError;
window.showErr = window.WowUtils.showError;
