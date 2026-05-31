/**
 * Phase ②: リアクション共通基盤 (アニメーションコントローラー)
 * A案・B案のトリガーに依存しない、独立した演出システム
 */
class ReactionSystem {
    // ① 下地の再定義で決定した5つのリアクション
    static DEFINITIONS = {
        'かっこいい': { main: '⚡', subs: ['⚡', '😎', '🎸', '🛹', '🖤'], color: '#F1C40F', copy: '視線を奪う、洗練のオーラ。' },
        'かわいい':   { main: '💖', subs: ['✨', '💖', '🎀', '🌸', '🧸'], color: '#FF7675', copy: 'きゅんとする、愛されスタイル。' },
        'エモい':     { main: '🎨', subs: ['🌃', '☕', '🍂', '💧', '🎧'], color: '#9B59B6', copy: '心に響く、彩りの瞬間。' },
        '役に立つ':   { main: '✅', subs: ['📚', '✍', '✨', '🔍', '🙌'], color: '#27AE60', copy: 'これからの私をアップデート。' },
        'ディグる':   { main: '🔍', subs: ['💎', '🎯', '🔥', '👀', '💯'], color: '#00CEC9', copy: '私だけの『特別』を掘り起こす。' }
    };

    /**
     * リアクション演出を実行する
     * @param {string} type 'かっこいい', 'かわいい' などの種別
     * @param {Array<string>} tags 噴火させるハッシュタグ文字列の配列
     */
    static trigger(type, tags = []) {
        const def = this.DEFINITIONS[type];
        if (!def) {
            console.warn(`[ReactionSystem] Unknown reaction type: ${type}`);
            return;
        }

        // デバイスのバイブレーション（対応している場合）
        if (navigator.vibrate) navigator.vibrate([15, 30, 15]);

        // エフェクト用レイヤーの生成
        const layer = document.createElement('div');
        layer.id = 'reaction-fx-layer';
        layer.style.setProperty('--rx-color', def.color);

        // 一、フレーム発光
        const frameGlow = document.createElement('div');
        frameGlow.className = 'fx-frame-glow';
        layer.appendChild(frameGlow);

        // 二、画面カラー塗り
        const colorFill = document.createElement('div');
        colorFill.className = 'fx-color-fill';
        layer.appendChild(colorFill);

        // 三、絵文字登場 (0.3秒遅延)
        setTimeout(() => {
            const mainEmoji = document.createElement('div');
            mainEmoji.className = 'fx-main-emoji';
            mainEmoji.textContent = def.main;
            layer.appendChild(mainEmoji);
            if (navigator.vibrate) navigator.vibrate([40]);
        }, 300);

        // 四、絵文字の豪雨 (0.5秒遅延)
        setTimeout(() => {
            for (let i = 0; i < 30; i++) {
                const sub = document.createElement('div');
                sub.className = 'fx-rain-emoji';
                sub.textContent = def.subs[Math.floor(Math.random() * def.subs.length)];
                sub.style.left = `${Math.random() * 100}%`;
                
                // 落下タイミングと速度をばらつかせる
                const delay = Math.random() * 0.5;
                const duration = 1.0 + Math.random() * 0.5;
                sub.style.animationDelay = `${delay}s`;
                sub.style.animationDuration = `${duration}s`;
                layer.appendChild(sub);
            }
        }, 500);

        // 五、噴火 (0.8秒遅延)
        setTimeout(() => {
            const displayTags = tags.length > 0 ? tags : [type];
            displayTags.forEach((tag) => {
                const tagEl = document.createElement('div');
                tagEl.className = 'fx-eruption-tag';
                tagEl.textContent = tag.startsWith('#') ? tag : `#${tag}`;
                
                // 上方向への扇状のランダムな拡散角と距離
                const angle = -Math.PI / 2 + (Math.random() * Math.PI / 2 - Math.PI / 4);
                const distance = 120 + Math.random() * 150;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                
                tagEl.style.setProperty('--tx', `calc(-50% + ${tx}px)`);
                tagEl.style.setProperty('--ty', `${ty}px`);
                layer.appendChild(tagEl);
            });
            if (navigator.vibrate) navigator.vibrate([20, 20]);
        }, 800);

        document.body.appendChild(layer);

        // 六、画面復帰 ＆ 七、終了 (3秒後にDOMから完全削除)
        setTimeout(() => {
            if (document.body.contains(layer)) document.body.removeChild(layer);
        }, 3000);
    }
}
window.ReactionSystem = ReactionSystem;

/**
 * Phase ③: A案 (パレット・ドラッグ型) UIコントローラー
 */
class ReactionPalette {
    static isVisible = false;
    static container = null;

    static toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    static show() {
        if (this.container) return;
        if (navigator.vibrate) navigator.vibrate([15]);

        this.container = document.createElement('div');
        this.container.id = 'reaction-palette-container';
        // デザインの垢抜け：丸みを大きくし、ガラス感を強調。キャッチコピー領域を追加。
        this.container.className = 'fixed bottom-[6rem] left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] p-4 flex flex-col items-center gap-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] z-[9999] opacity-0 translate-y-8 transition-all duration-400 ease-out';
        
        // キャッチコピー表示用
        const copyDisplay = document.createElement('div');
        copyDisplay.className = 'text-[10px] font-bold text-on-surface-variant dark:text-white/60 tracking-widest min-h-[16px] text-center transition-all duration-300';
        copyDisplay.textContent = 'リアクションをドラッグ＆ドロップ';
        this.container.appendChild(copyDisplay);

        const emojiWrapper = document.createElement('div');
        emojiWrapper.className = 'flex gap-5 items-center justify-center';
        
        Object.entries(ReactionSystem.DEFINITIONS).forEach(([type, def]) => {
            const btn = document.createElement('div');
            // アイコン自体の装飾を洗練させる
            btn.className = 'reaction-drag-item text-4xl cursor-grab active:cursor-grabbing hover:scale-125 hover:-translate-y-2 transition-all duration-300 relative select-none touch-none filter drop-shadow-md';
            btn.dataset.type = type;
            btn.textContent = def.main;
            
            const updateCopy = () => { copyDisplay.textContent = def.copy; copyDisplay.style.color = def.color; };
            const resetCopy = () => { copyDisplay.textContent = 'リアクションをドラッグ＆ドロップ'; copyDisplay.style.color = ''; };

            btn.addEventListener('mouseenter', updateCopy);
            btn.addEventListener('mouseleave', resetCopy);

            // ドラッグ＆ドロップ用イベント
            let startX = 0, startY = 0, initialX = 0, initialY = 0;
            let clone = null;
            let currentDragTarget = null;
            let dragFrameGlow = null;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                updateCopy();
                if (navigator.vibrate) navigator.vibrate([10]);
                const touch = e.touches[0];
                const rect = btn.getBoundingClientRect();
                
                clone = btn.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
                clone.style.margin = '0';
                clone.style.zIndex = '100000';
                clone.style.pointerEvents = 'none';
                clone.style.transform = 'scale(2.5) rotate(-15deg)';
                clone.style.filter = `drop-shadow(0 15px 25px ${def.color}80)`;
                clone.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                document.body.appendChild(clone);
                
                // フレーム発光レイヤーを作成
                dragFrameGlow = document.createElement('div');
                dragFrameGlow.id = 'reaction-drag-frame-glow';
                dragFrameGlow.className = 'fixed inset-0 pointer-events-none z-[99998] transition-all duration-300 opacity-0';
                dragFrameGlow.style.boxShadow = `inset 0 0 30px 5px ${def.color}80`;
                dragFrameGlow.style.border = `0px solid ${def.color}`;
                document.body.appendChild(dragFrameGlow);
                
                requestAnimationFrame(() => {
                    if (dragFrameGlow) dragFrameGlow.style.opacity = '1';
                });

                startX = touch.clientX;
                startY = touch.clientY;
                initialX = rect.left;
                initialY = rect.top;
                
                btn.style.opacity = '0.3';
                btn.style.transform = 'scale(0.8)';
                
                // ドラッグ中はパレット自体を半透明にして縮小
                this.container.style.opacity = '0.4';
                this.container.style.transform = 'translate(-50%, 10px) scale(0.95)';
            }, { passive: false });

            btn.addEventListener('touchmove', (e) => {
                if (!clone) return;
                e.preventDefault();
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                // 移動量に応じて大げさに傾きを揺らす
                const rot = -15 + (dx * 0.05);
                clone.style.left = `${initialX + dx}px`;
                clone.style.top = `${initialY + dy}px`;
                clone.style.transform = `scale(2.5) rotate(${rot}deg)`;
                
                // ドロップ対象（ポストカード）のホバー判定
                const touchEl = document.elementFromPoint(touch.clientX, touch.clientY);
                const cardContainer = touchEl ? touchEl.closest('.postcard-container') : null;

                if (currentDragTarget !== cardContainer) {
                    if (currentDragTarget) {
                        currentDragTarget.classList.remove('drag-target-hover');
                        currentDragTarget.style.boxShadow = '';
                    }
                    currentDragTarget = cardContainer;
                    if (currentDragTarget) {
                        currentDragTarget.classList.add('drag-target-hover');
                        currentDragTarget.style.boxShadow = `0 30px 60px -15px ${def.color}90`;
                        
                        // ホバー時はフレーム発光も強く、太くする（大きく迫る演出）
                        if (dragFrameGlow) {
                            dragFrameGlow.style.boxShadow = `inset 0 0 60px 15px ${def.color}`;
                            dragFrameGlow.style.border = `4px solid ${def.color}`;
                        }
                        if (navigator.vibrate) navigator.vibrate([10]); // 吸い付くような触感
                    } else {
                        if (dragFrameGlow) {
                            dragFrameGlow.style.boxShadow = `inset 0 0 30px 5px ${def.color}80`;
                            dragFrameGlow.style.border = `0px solid transparent`;
                        }
                    }
                }
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                resetCopy();
                if (!clone) return;
                
                // ホバー状態とフレーム発光のクリア
                if (currentDragTarget) {
                    currentDragTarget.classList.remove('drag-target-hover');
                    currentDragTarget.style.boxShadow = '';
                    currentDragTarget = null;
                }
                if (dragFrameGlow) {
                    dragFrameGlow.style.opacity = '0';
                    const el = dragFrameGlow;
                    setTimeout(() => el.remove(), 300);
                    dragFrameGlow = null;
                }

                const touch = e.changedTouches[0];
                
                // ドロップ地点の要素を取得
                clone.style.display = 'none';
                const droppedOn = document.elementFromPoint(touch.clientX, touch.clientY);
                clone.style.display = '';

                clone.style.transform = 'scale(0)';
                clone.style.opacity = '0';
                setTimeout(() => { if (clone) clone.remove(); clone = null; }, 200);

                btn.style.opacity = '1';
                btn.style.transform = '';

                this.container.style.opacity = '1';
                this.container.style.transform = 'translate(-50%, 0) scale(1)';

                // ドロップ先がコミュニティフィード内の要素か判定
                const appContainer = document.getElementById('community-app');
                if (appContainer && appContainer.contains(droppedOn)) {
                    if (navigator.vibrate) navigator.vibrate([15, 30]);
                    
                    // ドロップ先のカードからハッシュタグを取得
                    const cardContainer = droppedOn.closest('.postcard-container');
                    let tags = [];
                    if (cardContainer && cardContainer.dataset.hashtags) {
                        tags = cardContainer.dataset.hashtags.split(',');
                    }
                    
                    // リアクション実行（A案）
                    ReactionSystem.trigger(type, tags);
                    ReactionPalette.hide();
                } else {
                    if (navigator.vibrate) navigator.vibrate([5]);
                }
            });

            emojiWrapper.appendChild(btn);
        });

        this.container.appendChild(emojiWrapper);
        document.body.appendChild(this.container);
        
        requestAnimationFrame(() => {
            this.container.classList.remove('opacity-0', 'translate-y-8');
            this.container.classList.add('opacity-100', 'translate-y-0');
        });
        
        this.isVisible = true;

        // パレット外をタップしたら閉じる
        const closeHandler = (e) => {
            if (this.container && !this.container.contains(e.target) && !e.target.closest('#nav-discover')) {
                this.hide();
                document.removeEventListener('touchstart', closeHandler);
                document.removeEventListener('mousedown', closeHandler);
            }
        };
        setTimeout(() => {
            document.addEventListener('touchstart', closeHandler);
            document.addEventListener('mousedown', closeHandler);
        }, 100);
    }

    static hide() {
        if (!this.container) return;
        this.container.classList.remove('opacity-100', 'translate-y-0');
        this.container.classList.add('opacity-0', 'translate-y-8');
        const el = this.container;
        this.container = null;
        this.isVisible = false;
        setTimeout(() => el.remove(), 300);
    }
}
window.ReactionPalette = ReactionPalette;