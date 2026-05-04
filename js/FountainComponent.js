// js/FountainComponent.js
// Cinematic: spotlight outside-dimming + card elevation + lens flare + 3D spin-rise

window.FountainComponent = (() => {
    let _stylesInjected = false;

    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;
        const s = document.createElement('style');
        s.id = 'fountain-component-styles';
        s.textContent = `
/* ===== Fallback desat (anchorEl なし時) ===== */
.fc-desat-overlay {
    position: fixed; inset: 0; z-index: 9951; pointer-events: none;
    backdrop-filter: saturate(0.08) brightness(0.52);
    -webkit-backdrop-filter: saturate(0.08) brightness(0.52);
    background: rgba(0, 0, 0, 0.42);
    opacity: 0; transition: opacity 0.16s ease;
}
.fc-desat-overlay.fc-in  { opacity: 1; }
.fc-desat-overlay.fc-out { opacity: 0; transition: opacity 0.55s ease; }

/* ===== Lens Flare — z:9975 (暗い外側を切り裂く) ===== */
.fc-flare-beam {
    position: fixed; z-index: 9975; pointer-events: none;
    height: 2px; width: 120vw; left: -120vw;
    animation: fc-beam-sweep 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.fc-flare-beam-b {
    position: fixed; z-index: 9975; pointer-events: none;
    height: 0.5px; width: 90vw; left: -90vw;
    animation: fc-beam-sweep 0.68s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards;
}
@keyframes fc-beam-sweep {
    0%   { left: -120vw; opacity: 0.95; }
    55%  { opacity: 0.7; }
    100% { left: 120vw;  opacity: 0; }
}
.fc-flare-orb {
    position: fixed; z-index: 9976; pointer-events: none; border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: fc-orb-burst 0.62s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fc-orb-burst {
    0%   { transform: translate(-50%, -50%) scale(0);   opacity: 1; }
    35%  { transform: translate(-50%, -50%) scale(1.3); opacity: 0.9; }
    100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
}

/* ===== 3D Spin-Rise Particle — z:9980 ===== */
.fc-particle {
    position: fixed; z-index: 9980; pointer-events: none;
    transform-style: preserve-3d; will-change: transform, opacity;
    animation: fc-spin-rise var(--fc-dur, 1.4s) cubic-bezier(0.22, 1, 0.36, 1) var(--fc-delay, 0ms) forwards;
}
@keyframes fc-spin-rise {
    0%   { transform: translateY(0px)   rotateY(0deg)   scale(0.3); opacity: 0; }
    18%  { opacity: 1; }
    38%  { transform: translateY(-28px) rotateY(360deg) scale(1.05); }
    100% { transform: translateY(var(--fc-rise, -240px)) rotateY(720deg) scale(0.55); opacity: 0; }
}

/* ===== Behind-card glow — z:9910 ===== */
.fc-behind-glow {
    position: fixed; z-index: 9910; pointer-events: none; border-radius: 50%;
    animation: fc-behind-glow-burst 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fc-behind-glow-burst {
    0%   { transform: translate(-50%, -50%) scale(0);   opacity: 0; }
    22%  { opacity: 1; }
    65%  { transform: translate(-50%, -50%) scale(3.8); opacity: 0.62; }
    100% { transform: translate(-50%, -50%) scale(6.0); opacity: 0; }
}

/* ===== Pickup vignette — z:9920 ===== */
.fc-pickup-vignette {
    position: fixed; inset: 0; z-index: 9920; pointer-events: none;
    opacity: 0; transition: opacity 0.28s ease;
}
.fc-pickup-vignette.fc-pv-in { opacity: 1; }
        `;
        document.head.appendChild(s);
    }

    // ===== kion-dimOverlay をスポットライト化 =====
    // transparent 穴の中心 = カード、外側を彩度ゼロの深い暗色で塗る
    function _applySpotlightToOverlay(overlay, anchorEl) {
        if (!overlay || !anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        const vw   = window.innerWidth;
        const vh   = window.innerHeight;
        const pctX = ((rect.left + rect.width  / 2) / vw * 100).toFixed(1) + '%';
        const pctY = ((rect.top  + rect.height / 2) / vh * 100).toFixed(1) + '%';
        // カードサイズ + 余白
        const rw   = Math.max(rect.width  / 2 + 64, 130) + 'px';
        const rh   = Math.max(rect.height / 2 + 80, 160) + 'px';

        const grad = `radial-gradient(ellipse ${rw} ${rh} at ${pctX} ${pctY},
            transparent 0%, transparent 78%, rgba(0,0,10,0.92) 100%)`;
        const mask = `radial-gradient(ellipse ${rw} ${rh} at ${pctX} ${pctY},
            transparent 0%, transparent 78%, black 100%)`;

        // kion が設定した solid background を spotlight gradient で上書き
        overlay.style.background          = grad;
        overlay.style.backdropFilter      = 'saturate(0.05) brightness(0.35)';
        overlay.style.webkitBackdropFilter = 'saturate(0.05) brightness(0.35)';
        overlay.style.maskImage            = mask;
        overlay.style.webkitMaskImage      = mask;

        // celebration 終了後にリセット（kion が opacity:0 にする 2500ms の後）
        setTimeout(() => {
            overlay.style.background           = '';
            overlay.style.backdropFilter       = '';
            overlay.style.webkitBackdropFilter = '';
            overlay.style.maskImage            = '';
            overlay.style.webkitMaskImage      = '';
        }, 2750);
    }

    // ===== フォールバック: 全画面暗転 =====
    function _triggerDesatDim(holdMs) {
        const overlay = document.createElement('div');
        overlay.className = 'fc-desat-overlay';
        document.body.appendChild(overlay);
        void overlay.offsetWidth;
        overlay.classList.add('fc-in');
        setTimeout(() => {
            overlay.classList.remove('fc-in');
            overlay.classList.add('fc-out');
            setTimeout(() => overlay.remove(), 600);
        }, holdMs || 480);
    }

    // ===== 背後グロー（ガラスカードを透過する光源） =====
    function _triggerBehindCardGlow(colorHex, anchorEl) {
        const rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
        const cx   = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
        const cy   = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2;
        const glow = document.createElement('div');
        glow.className = 'fc-behind-glow';
        glow.style.left       = cx + 'px';
        glow.style.top        = cy + 'px';
        glow.style.width      = '150px';
        glow.style.height     = '150px';
        glow.style.background = `radial-gradient(circle, ${colorHex}99 0%, ${colorHex}30 52%, transparent 70%)`;
        document.body.appendChild(glow);
        setTimeout(() => glow.remove(), 1150);
    }

    // ===== レンズフレア（暗い外側を水平に切り裂く） =====
    function _triggerLensFlare(colorHex) {
        const cy = window.innerHeight * (0.3 + Math.random() * 0.4);
        const cx = window.innerWidth  * (0.25 + Math.random() * 0.5);

        const beam = document.createElement('div');
        beam.className = 'fc-flare-beam';
        beam.style.top        = cy + 'px';
        beam.style.background = `linear-gradient(90deg, transparent 0%, ${colorHex}cc 28%, #fff 50%, ${colorHex}cc 72%, transparent 100%)`;
        beam.style.boxShadow  = `0 0 18px 5px ${colorHex}77`;
        document.body.appendChild(beam);
        setTimeout(() => beam.remove(), 720);

        const beam2 = document.createElement('div');
        beam2.className  = 'fc-flare-beam-b';
        beam2.style.top  = (cy + (Math.random() > 0.5 ? 1 : -1) * (16 + Math.random() * 34)) + 'px';
        beam2.style.transform   = `rotate(${-7 + Math.random() * 14}deg)`;
        beam2.style.background  = `linear-gradient(90deg, transparent 0%, ${colorHex}88 35%, ${colorHex}aa 65%, transparent 100%)`;
        document.body.appendChild(beam2);
        setTimeout(() => beam2.remove(), 920);

        const orb = document.createElement('div');
        orb.className    = 'fc-flare-orb';
        orb.style.left   = cx + 'px';
        orb.style.top    = cy + 'px';
        orb.style.width  = orb.style.height = '58px';
        orb.style.background = `radial-gradient(circle, #fff 0%, ${colorHex}dd 38%, transparent 70%)`;
        orb.style.boxShadow  = `0 0 40px 20px ${colorHex}55`;
        document.body.appendChild(orb);
        setTimeout(() => orb.remove(), 820);
    }

    // ===== 3D スピン上昇パーティクル（カード上部から発射） =====
    function _spawnSpinRiseParticles(emojis, colorHex, count, anchorEl) {
        const rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
        const cx   = rect ? rect.left + rect.width  / 2         : window.innerWidth  / 2;
        const cy   = rect ? rect.top  + rect.height * 0.72      : window.innerHeight * 0.62;

        for (let i = 0; i < count; i++) {
            const el       = document.createElement('div');
            el.className   = 'fc-particle';
            el.textContent = emojis[i % emojis.length];

            const ox    = (Math.random() - 0.5) * 180;
            const rise  = 200 + Math.random() * 240;
            const dur   = 1.05 + Math.random() * 0.65;
            const delay = i * 26 + Math.random() * 18;
            const size  = 0.9  + Math.random() * 1.1;

            el.style.left     = (cx + ox) + 'px';
            el.style.top      = cy + 'px';
            el.style.fontSize = size + 'rem';
            el.style.setProperty('--fc-rise',  `-${rise}px`);
            el.style.setProperty('--fc-dur',   dur + 's');
            el.style.setProperty('--fc-delay', delay + 'ms');
            el.style.filter   = `drop-shadow(0 0 7px ${colorHex}cc)`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), (dur * 1000) + delay + 280);
        }
    }

    // ===== Pickup vignette 管理 =====
    let _pvEl = null;

    const FountainComponent = {
        // リアクション発火時のフルセット演出
        fire(reaction, anchorEl) {
            _injectStyles();
            const colorHex  = reaction.color || '#4A90E2';
            const mainEmoji = reaction.emoji || reaction.icon || '✨';
            const subs      = (reaction.subs && reaction.subs.length) ? reaction.subs : [mainEmoji];

            // 1. アウトサイド・ディミング: kion dimOverlay をスポットライト化
            const dimOverlay = document.getElementById('kion-dimOverlay');
            if (dimOverlay && anchorEl) {
                _applySpotlightToOverlay(dimOverlay, anchorEl);
            } else {
                _triggerDesatDim(480);
            }

            // 2. 背後グロー（ガラスを透過して輝く光源）
            _triggerBehindCardGlow(colorHex, anchorEl);

            // 3. レンズフレア（80ms delay、暗い外側を切り裂く）
            setTimeout(() => _triggerLensFlare(colorHex), 80);

            // 4. 3Dスピン上昇パーティクル
            _spawnSpinRiseParticles(subs, colorHex, 20, anchorEl);
        },

        // ドラッグPickup時: 周囲を徐々に暗くし、カードを浮かせる
        setPickupFocus(card, colorHex) {
            _injectStyles();
            this.clearPickupFocus();
            if (!card) return;

            const rect = card.getBoundingClientRect();
            const vw   = window.innerWidth;
            const vh   = window.innerHeight;
            const pctX = ((rect.left + rect.width  / 2) / vw * 100).toFixed(1) + '%';
            const pctY = ((rect.top  + rect.height / 2) / vh * 100).toFixed(1) + '%';
            const rw   = Math.max(rect.width  / 2 + 55, 110) + 'px';
            const rh   = Math.max(rect.height / 2 + 68, 135) + 'px';

            const el = document.createElement('div');
            el.className    = 'fc-pickup-vignette';
            el.style.background = `radial-gradient(ellipse ${rw} ${rh} at ${pctX} ${pctY},
                transparent 0%, transparent 83%, rgba(0,0,10,0.62) 100%)`;
            document.body.appendChild(el);
            _pvEl = el;
            void el.offsetWidth;
            el.classList.add('fc-pv-in');
        },

        clearPickupFocus() {
            if (!_pvEl) return;
            const el = _pvEl;
            _pvEl = null;
            el.classList.remove('fc-pv-in');
            setTimeout(() => el.remove(), 320);
        }
    };

    window.FountainComponent = FountainComponent;
    return FountainComponent;
})();
