// js/FountainComponent.js

window.FountainComponent = (() => {
    let paletteEl = null;
    let isPaletteOpen = false;
    let dragGhostEl = null;
    let currentDragReaction = null;
    let lastDropTarget = null;

    function initPalette() {
        if (paletteEl) return;
        
        paletteEl = document.createElement('div');
        paletteEl.id = 'global-reaction-palette';
        // モバイル向け下部パレット (ナビゲーションバーの上に表示されるよう z-index 調整)
        paletteEl.className = 'fixed bottom-[90px] left-1/2 -translate-x-1/2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-5 py-3 rounded-full border border-black/10 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex gap-4 transition-all duration-300 z-[9900] origin-bottom';
        paletteEl.style.transform = 'translate(-50%, 150px) scale(0.4)';
        paletteEl.style.opacity = '0';
        paletteEl.style.pointerEvents = 'none';

        const themes = Object.values(window.WOW_CONSTANTS.REACTION_THEMES);
        themes.forEach(theme => {
            const btnWrap = document.createElement('div');
            btnWrap.className = 'relative flex flex-col items-center gap-1 group';

            const btn = document.createElement('div');
            btn.className = 'w-12 h-12 flex items-center justify-center text-3xl bg-white dark:bg-slate-800 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none border border-black/5 dark:border-white/5';
            btn.textContent = theme.emoji;
            btn.dataset.themeId = theme.id;
            
            const label = document.createElement('span');
            label.className = 'absolute -top-8 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none';
            label.textContent = theme.label;

            btnWrap.appendChild(label);
            btnWrap.appendChild(btn);

            btn.addEventListener('pointerdown', (e) => handleDragStart(e, theme, btn));
            paletteEl.appendChild(btnWrap);
        });

        document.body.appendChild(paletteEl);

        // グローバルドラッグイベント
        window.addEventListener('pointermove', handleDragMove, { passive: false });
        window.addEventListener('pointerup', handleDragEnd);
        window.addEventListener('pointercancel', handleDragEnd);
        
        // パレット外クリックで閉じる
        document.addEventListener('click', (e) => {
            if (isPaletteOpen && !paletteEl.contains(e.target) && !e.target.closest('#nav-discover')) {
                togglePalette();
            }
        });
    }

    function togglePalette() {
        initPalette();
        isPaletteOpen = !isPaletteOpen;
        if (isPaletteOpen) {
            paletteEl.style.transform = 'translate(-50%, 0) scale(1)';
            paletteEl.style.opacity = '1';
            paletteEl.style.pointerEvents = 'auto';
            if (navigator.vibrate) navigator.vibrate([15]);
        } else {
            paletteEl.style.transform = 'translate(-50%, 150px) scale(0.4)';
            paletteEl.style.opacity = '0';
            paletteEl.style.pointerEvents = 'none';
        }
    }

    function handleDragStart(e, theme, btn) {
        if (!isPaletteOpen) return;
        e.preventDefault();
        
        currentDragReaction = theme;
        btn.style.transform = 'scale(0.8)';
        btn.style.opacity = '0.5';

        // 指に追従するゴースト絵文字
        dragGhostEl = document.createElement('div');
        dragGhostEl.className = 'fixed z-[10000] flex items-center justify-center w-16 h-16 rounded-full pointer-events-none transition-transform duration-75';
        dragGhostEl.innerHTML = `<span class="text-5xl drop-shadow-2xl" style="filter: drop-shadow(0 8px 16px ${theme.color})">${theme.emoji}</span>`;
        dragGhostEl.style.left = `${e.clientX - 32}px`;
        dragGhostEl.style.top = `${e.clientY - 32}px`;
        document.body.appendChild(dragGhostEl);

        if (navigator.vibrate) navigator.vibrate([20]);
    }

    function handleDragMove(e) {
        if (!dragGhostEl) return;
        e.preventDefault();
        
        dragGhostEl.style.left = `${e.clientX - 32}px`;
        dragGhostEl.style.top = `${e.clientY - 32}px`;

        // ヒットテスト (ゴーストを一時的に非表示にして裏の要素を取得)
        dragGhostEl.style.display = 'none';
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        dragGhostEl.style.display = 'flex';

        // 近くのポストカードを取得
        const card = hit?.closest('[data-card="post-card"]');
        if (card !== lastDropTarget) {
            if (lastDropTarget) releaseFocus(lastDropTarget);
            if (card) engageFocus(card, currentDragReaction.color);
            lastDropTarget = card;
        }
    }

    function handleDragEnd(e) {
        if (!dragGhostEl) return;

        // パレットのボタンを元に戻す
        const btn = paletteEl.querySelector(`[data-theme-id="${currentDragReaction.id}"]`);
        if (btn) {
            btn.style.transform = '';
            btn.style.opacity = '';
        }

        if (lastDropTarget) {
            const target = lastDropTarget;
            const reaction = currentDragReaction;
            releaseFocus(target);

            // 対象にドロップされたアニメーション (吸い込まれる)
            dragGhostEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            const rect = target.getBoundingClientRect();
            dragGhostEl.style.left = `${rect.left + rect.width / 2 - 32}px`;
            dragGhostEl.style.top = `${rect.top + rect.height / 2 - 32}px`;
            dragGhostEl.style.transform = 'scale(0)';
            dragGhostEl.style.opacity = '0';

            setTimeout(() => {
                if (dragGhostEl) dragGhostEl.remove();
                dragGhostEl = null;
                FountainComponent.fire(reaction, target);
                // Persist reaction to Supabase (postId is carried on the card element)
                const postId = target.dataset.postId;
                if (postId && window.PostService) {
                    window.PostService.addReaction(postId, reaction.id);
                }
                // Vueコンポーネント側にイベントを発火してUIの数字を即座に増やす
                target.dispatchEvent(new CustomEvent('add-reaction', { detail: { reactionId: reaction.id } }));
            }, 300);
            
            togglePalette();
        } else {
            // キャンセル (空振り)
            dragGhostEl.style.transition = 'all 0.2s ease';
            dragGhostEl.style.transform = 'scale(0)';
            dragGhostEl.style.opacity = '0';
            setTimeout(() => {
                if (dragGhostEl) dragGhostEl.remove();
                dragGhostEl = null;
            }, 200);
        }

        currentDragReaction = null;
        lastDropTarget = null;
    }

    function engageFocus(card, colorHex) {
        // テーマカラーに光りながら少しだけ膨張
        card.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease';
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = `0 10px 40px ${colorHex}40, inset 0 0 15px ${colorHex}25`;
        card.style.borderColor = colorHex;
        if (navigator.vibrate) navigator.vibrate([10]);
    }

    function releaseFocus(card) {
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.borderColor = '';
        setTimeout(() => {
            if (card) card.style.transition = '';
        }, 300);
    }

    // ===== CSS インジェクション (一度だけ) =====
    let _stylesReady = false;
    function _injectStyles() {
        if (_stylesReady) return;
        _stylesReady = true;
        const s = document.createElement('style');
        s.textContent = `
/* ソフトグロー放射 */
@keyframes fc-glow-burst {
    0%   { width:0;height:0;transform:translate(-50%,-50%);opacity:0.9; }
    60%  { width:360px;height:360px;transform:translate(-50%,-50%);opacity:0.6; }
    100% { width:580px;height:580px;transform:translate(-50%,-50%);opacity:0; }
}
/* クリスプリング */
@keyframes fc-ring-expand {
    0%   { width:8px;height:8px;transform:translate(-50%,-50%);opacity:1;border-width:2px; }
    100% { width:280px;height:280px;transform:translate(-50%,-50%);opacity:0;border-width:0.5px; }
}
/* セカンドリング(遅延) */
@keyframes fc-ring2-expand {
    0%   { width:4px;height:4px;transform:translate(-50%,-50%);opacity:0.6;border-width:1.5px; }
    100% { width:160px;height:160px;transform:translate(-50%,-50%);opacity:0;border-width:0.5px; }
}
/* 巨大絵文字の3Dポップアウト */
@keyframes fc-3d-pop {
    0%   { transform: translate(-50%, -50%) scale(0) rotateX(60deg) rotateY(-45deg); opacity: 0; filter: drop-shadow(0 0 0px var(--fc-color)); }
    20%  { transform: translate(-50%, -50%) scale(1.6) rotateX(-20deg) rotateY(20deg); opacity: 1; filter: drop-shadow(0 30px 50px var(--fc-color)); }
    40%  { transform: translate(-50%, -50%) scale(1.2) rotateX(15deg) rotateY(-15deg); opacity: 1; filter: drop-shadow(0 15px 30px var(--fc-color)); }
    60%  { transform: translate(-50%, -50%) scale(1.35) rotateX(-5deg) rotateY(5deg); opacity: 1; filter: drop-shadow(0 20px 40px var(--fc-color)); }
    80%  { transform: translate(-50%, -50%) scale(1.25) rotateX(0deg) rotateY(0deg); opacity: 1; filter: drop-shadow(0 10px 20px var(--fc-color)); }
    100% { transform: translate(-50%, -50%) scale(3) rotateX(0deg) rotateY(0deg); opacity: 0; filter: blur(12px); }
}
/* サブ絵文字の3D空間バースト */
@keyframes fc-burst {
    0%   { transform: translate3d(0, 0, 0) scale(0.2) rotate(0deg); opacity: 0; }
    15%  { transform: translate3d(calc(var(--fc-vx) * 0.4), calc(var(--fc-vy) * 0.4), 150px) scale(1.5) rotate(calc(var(--fc-rot) * 0.3)); opacity: 1; }
    100% { transform: translate3d(var(--fc-vx), var(--fc-vy), -150px) scale(0.4) rotate(var(--fc-rot)); opacity: 0; }
}
/* タグのホログラム風飛び出し */
@keyframes fc-tag-pop {
    0%   { transform: translate(0, 0) scale(0.5); opacity: 0; box-shadow: 0 0 0 var(--fc-color); }
    25%  { transform: translate(calc(var(--fc-tx) * 0.8), calc(var(--fc-ty) * 0.8)) scale(1.2); opacity: 1; box-shadow: 0 15px 30px var(--fc-color); }
    100% { transform: translate(var(--fc-tx), var(--fc-ty)) scale(0.85); opacity: 0; box-shadow: 0 5px 10px transparent; }
}
/* リアクション名バッジ */
@keyframes fc-badge-in {
    0%   { transform: translate(-50%, -50%) scale(0) rotate(-8deg); opacity: 0; }
    60%  { transform: translate(-50%, -50%) scale(1.1) rotate(2deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
}
@keyframes fc-badge-out {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, calc(-50% - 60px)) scale(0.7); opacity: 0; }
}
/* スパークル */
@keyframes fc-sparkle {
    0%   { transform: translate(0,0) scale(0) rotate(0deg); opacity: 1; }
    50%  { transform: translate(calc(var(--fc-tx)*0.6), calc(var(--fc-ty)*0.6)) scale(1.4) rotate(180deg); opacity: 1; }
    100% { transform: translate(var(--fc-tx), var(--fc-ty)) scale(0) rotate(360deg); opacity: 0; }
}`;
        document.head.appendChild(s);
    }

    // ===== 1. ソフトグロー + リング =====
    function _glowRing(colorHex, cx, cy) {
        // ソフトラジアルグロー
        const glow = document.createElement('div');
        glow.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;border-radius:50%;pointer-events:none;z-index:9950;background:radial-gradient(circle, ${colorHex}55 0%, ${colorHex}18 40%, transparent 70%);animation:fc-glow-burst 1s cubic-bezier(0.2,0.8,0.2,1) forwards;`;
        document.body.appendChild(glow);
        setTimeout(() => glow.remove(), 1100);

        // クリスプリング
        const ring = document.createElement('div');
        ring.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;border-radius:50%;border:2px solid ${colorHex};pointer-events:none;z-index:9952;animation:fc-ring-expand 0.75s cubic-bezier(0.2,1,0.4,1) forwards;`;
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 800);

        // セカンドリング(わずかに遅延)
        const ring2 = document.createElement('div');
        ring2.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;border-radius:50%;border:1.5px solid ${colorHex}90;pointer-events:none;z-index:9951;animation:fc-ring2-expand 0.6s cubic-bezier(0.2,1,0.4,1) 180ms forwards;`;
        document.body.appendChild(ring2);
        setTimeout(() => ring2.remove(), 900);
    }

    // ===== 2. 巨大絵文字 3Dポップアウト =====
    function _pop3DEmoji(emoji, colorHex, cx, cy) {
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:9960;pointer-events:none;font-size:6.5rem;line-height:1;--fc-color:${colorHex};animation:fc-3d-pop 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;perspective:1000px;transform-style:preserve-3d;`;
        el.textContent = emoji;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    // ===== 3. サブ絵文字 3D空間バースト =====
    function _burstSubs(subs, colorHex, cx, cy) {
        const count = 24;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            const angle = Math.random() * Math.PI * 2;
            const velocity = 150 + Math.random() * 250;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity + 150; // 重力で下に落ちる
            const rot = (Math.random() - 0.5) * 720 + 'deg';
            const dur = 800 + Math.random() * 500;
            
            const delay = i * 28;
            el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:9955;pointer-events:none;font-size:${1.8 + Math.random() * 1.5}rem;line-height:1;filter:drop-shadow(0 8px 16px ${colorHex}88);--fc-vx:${vx}px;--fc-vy:${vy}px;--fc-rot:${rot};animation:fc-burst ${dur}ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms 1 normal backwards;`;
            el.textContent = subs[i % subs.length];
            document.body.appendChild(el);
            setTimeout(() => el.remove(), dur + delay + 100);
        }
    }

    // ===== 4. カードバウンスパルス =====
    function _cardPulse(anchorEl, colorHex) {
        if (!anchorEl) return;
        const origTrans = anchorEl.style.transition;
        anchorEl.style.transition = 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.12s ease';
        anchorEl.style.transform = 'scale(1.07)';
        anchorEl.style.boxShadow = `0 0 60px ${colorHex}80, 0 0 120px ${colorHex}30, inset 0 0 30px ${colorHex}20`;
        setTimeout(() => {
            anchorEl.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 1.2s ease';
            anchorEl.style.transform = '';
            anchorEl.style.boxShadow = `0 0 40px ${colorHex}35`;
            setTimeout(() => {
                anchorEl.style.transition = origTrans || '';
                anchorEl.style.boxShadow = '';
            }, 1200);
        }, 120);
    }

    // ===== 5. リアクション名バッジ (ダークグラスピル) =====
    function _reactionBadge(reaction, cx, cy) {
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;left:${cx}px;top:${cy - 75}px;z-index:9970;pointer-events:none;display:flex;align-items:center;gap:5px;font-size:0.82rem;font-weight:900;letter-spacing:0.04em;white-space:nowrap;background:rgba(4,8,16,0.9);color:${reaction.color};border:1.5px solid ${reaction.color}70;padding:6px 16px 6px 12px;border-radius:999px;box-shadow:0 0 24px ${reaction.color}35,0 8px 40px rgba(0,0,0,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);animation:fc-badge-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;`;
        el.innerHTML = `<span style="font-size:1.1em;filter:drop-shadow(0 0 6px ${reaction.color})">${reaction.emoji}</span><span>${reaction.label}</span>`;
        document.body.appendChild(el);
        setTimeout(() => { el.style.animation = 'fc-badge-out 0.35s ease-in forwards'; }, 900);
        setTimeout(() => el.remove(), 1280);
    }

    // ===== 6. スパークル (輝く星形パーティクル) =====
    function _sparkles(colorHex, cx, cy) {
        const chars = ['✦', '✧', '⭒', '✶', '✴'];
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist  = 55 + Math.random() * 80;
            const el    = document.createElement('div');
            el.textContent = chars[i % chars.length];
            el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:9958;pointer-events:none;font-size:${0.7 + Math.random() * 0.7}rem;color:${colorHex};filter:drop-shadow(0 0 8px ${colorHex}) drop-shadow(0 0 20px ${colorHex}80);--fc-tx:${Math.cos(angle) * dist}px;--fc-ty:${Math.sin(angle) * dist}px;animation:fc-sparkle 0.85s cubic-bezier(0.34,1.56,0.64,1) ${i * 45}ms 1 normal both;`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 900 + i * 45);
        }
    }

    // ===== 7. ハッシュタグ リッチホログラム =====
    function _eruptTagsRich(anchorEl, colorHex) {
        const chips = Array.from(anchorEl.querySelectorAll('.tag-chip'));
        if (!chips.length) return;
        const rect = anchorEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        chips.slice(0, 5).forEach((chip, i) => {
            const angle = -90 + (i - (Math.min(chips.length, 5) - 1) / 2) * 45;
            const rad   = angle * Math.PI / 180;
            const dist  = 130 + Math.random() * 60;
            const tx = Math.cos(rad) * dist;
            const ty = Math.sin(rad) * dist;
            
            const el = document.createElement('div');
            el.textContent = chip.textContent.trim();
            el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:9965;pointer-events:none;font-size:0.85rem;font-weight:900;white-space:nowrap;background:linear-gradient(135deg, ${colorHex}dd, ${colorHex}88);color:#fff;border:1px solid rgba(255,255,255,0.5);padding:6px 14px;border-radius:12px;--fc-tx:${tx}px;--fc-ty:${ty}px;--fc-color:${colorHex};animation:fc-tag-pop 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 70}ms forwards;backdrop-filter:blur(4px);`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1200 + i * 70);
        });
    }

    const FountainComponent = {
        fire: function(reaction, anchorEl) {
            _injectStyles();
            if (navigator.vibrate) navigator.vibrate([15, 8, 25]);

            const colorHex = reaction.color || '#4A90E2';
            const mainEmoji = reaction.emoji || '✨';
            const subs = reaction.subs && reaction.subs.length ? reaction.subs : [mainEmoji, '✨', '⭐'];

            const rect = anchorEl ? anchorEl.getBoundingClientRect() : null;
            const cx   = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
            const cy   = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2;

            // 0. カードバウンス (即時)
            if (anchorEl) _cardPulse(anchorEl, colorHex);

            // 1. ソフトグロー + リング
            _glowRing(colorHex, cx, cy);

            // 2. スパークル
            setTimeout(() => _sparkles(colorHex, cx, cy), 30);

            // 3. メイン絵文字 3Dポップ
            setTimeout(() => _pop3DEmoji(mainEmoji, colorHex, cx, cy), 50);

            // 4. リアクション名バッジ
            setTimeout(() => _reactionBadge(reaction, cx, cy), 100);

            // 5. サブ絵文字 3Dバースト (スタガー付き)
            setTimeout(() => _burstSubs(subs, colorHex, cx, cy), 150);

            // 6. ハッシュタグ リッチホログラム
            if (anchorEl) setTimeout(() => _eruptTagsRich(anchorEl, colorHex), 200);
        },
        toggleGlobalPalette: togglePalette
    };
    return FountainComponent;
})();
