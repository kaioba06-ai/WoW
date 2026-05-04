// ===== ホームページ機能 =====

function toggleHomeLike(btn) {
    if(navigator.vibrate) navigator.vibrate([10]);
    const icon = btn.querySelector('.material-symbols-outlined');
    const liked = btn.dataset.liked === '1';
    btn.dataset.liked = liked ? '0' : '1';
    icon.style.fontVariationSettings = liked ? "'FILL' 0" : "'FILL' 1";
    btn.classList.toggle('bg-pink-500', !liked);
    btn.classList.toggle('bg-white/20', liked);
}

function shareOutfit() {
    const data = { title: 'WoW - Transitional Trench', text: '18°Cの今日のコーデをチェック！', url: window.location.href };
    if(navigator.share) {
        navigator.share(data).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => alert('リンクをクリップボードにコピーしました'));
    }
}

function saveHomeOutfitToCloset(btn) {
    if(btn.dataset.saved === '1') { alert('このコーデはすでにクローゼットに保存済みです'); return; }
    if(navigator.vibrate) navigator.vibrate([10,5,20]);
    const imgSrc = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBB-QU0-zAmjrV7pnLKHUgiq42DhOBVi6U6n2rMhuhPAJ9DFD3yAnTg8_cZlhEtM1jt_xcRiV3V5nqV4W4nxY1nZ04NrXI0drvrqzFwWyscagoTkfQCiywc6Q61IajoyXBC3md2K_WpPzzuBhePdWIoe7PyLVPtfI1V-A8jGrbHeACqCY0D3IHkfZb5CVYYY5XqjrdkSHyVcurwXLGZqSKKex5zuDV56EJjSWt0BitnnIWfR1P_mdcj8NABNIJmFSF4Jflq8pPFew';
    const item = { id: Date.now(), name: 'Transitional Trench', category: 'outer', color: '#8B6914', colorName: 'ベージュ', memo: 'AIおすすめコーデ', img: imgSrc, addedAt: new Date().toLocaleDateString('ja-JP') };
    closetItems.unshift(item);
    saveCloset();
    renderClosetGrid();
    btn.dataset.saved = '1';
    btn.innerHTML = '<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 1">check_circle</span> 保存済み';
    btn.classList.replace('bg-primary', 'bg-emerald-500');
    alert('クローゼットに保存しました！');
}
