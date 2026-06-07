// Supabase 認証ガード + プロフィール/クローゼット同期。
// 元は index.html に直書きされていたが、Shell Purity に従い分離。
// 依存: window.supabaseClient (index.html で生成), WOW_CONFIG (js/config.js)

(function() {
    'use strict';

    // ===== 認証ガード：未ログインなら login.html へリダイレクト =====
    async function checkAuthGuard() {
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) {
            console.error('Session error:', error);
            return;
        }
        if (!data.session) {
            console.log('Not logged in. Redirecting to login.html');
            window.location.href = 'login.html';
            return;
        }
        console.log('User logged in:', data.session.user.email);
        window.currentUser = data.session.user;
        await loadUserProfile();
    }

    // ===== Supabase からプロフィール情報を取得 =====
    async function loadUserProfile() {
        if (!window.currentUser) return;

        const { data, error } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('id', window.currentUser.id)
            .single();

        if (error) {
            console.error('[Profile] Load error:', error);
            return;
        }

        if (data) {
            console.log('[Profile] Loaded from Supabase:', data.username);
            const existing = JSON.parse(localStorage.getItem('kion_profile') || '{}');
            const supabaseFields = {
                name: data.username || existing.name || '',
                handle: data.username || existing.handle || '',
                avatar: data.avatar_emoji || existing.avatar || '🧣',
                bio: data.bio || existing.bio || '',
                temp_preference: data.temp_preference || existing.temp_preference || 'normal',
                styles: data.styles || existing.styles || [],
                photo: data.avatar_url || existing.photo || '',
                email: data.email || existing.email || ''
            };
            const profile = Object.assign({}, existing, supabaseFields);
            localStorage.setItem('kion_profile', JSON.stringify(profile));
            window.currentProfile = profile;

            window.applyProfileFromDB = function() {
                if (typeof applyProfileDisplay === 'function') {
                    applyProfileDisplay(profile);
                }
            };
        }

        await loadClosetData();
    }

    // ===== クローゼットデータを Supabase から読み込み =====
    async function loadClosetData() {
        const items = await window.loadClosetFromSupabase();
        const closetItems = items.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            color: item.color,
            colorName: item.color_name,
            memo: item.memo,
            img: item.image_url,
            addedAt: item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP') : ''
        }));
        localStorage.setItem('kion_closet_items', JSON.stringify(closetItems));
        if (typeof window.closetItems !== 'undefined') {
            window.closetItems = closetItems;
        }
    }

    // ===== クローゼット CRUD (Supabase) =====
    window.loadClosetFromSupabase = async function() {
        if (!window.currentUser) return [];
        const { data, error } = await window.supabaseClient
            .from('closet_items')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[Closet] Load error:', error);
            return [];
        }
        console.log('[Closet] Loaded from Supabase:', data?.length || 0, 'items');
        return data || [];
    };

    window.addClosetItemToSupabase = async function(item) {
        if (!window.currentUser) {
            console.error('[Closet] Not logged in');
            return { success: false };
        }
        const insertData = {
            user_id: window.currentUser.id,
            name: item.name || '',
            category: item.category || 'other',
            color: item.color || '#888',
            color_name: item.colorName || '',
            image_url: item.img || '',
            memo: item.memo || ''
        };
        const { data, error } = await window.supabaseClient
            .from('closet_items')
            .insert(insertData)
            .select()
            .single();
        if (error) {
            console.error('[Closet] Add error:', error);
            return { success: false, error: error.message };
        }
        console.log('[Closet] Added to Supabase:', data.id);
        return { success: true, data };
    };

    window.updateClosetItemInSupabase = async function(itemId, item) {
        if (!window.currentUser) return { success: false };
        const updateData = {
            name: item.name,
            category: item.category,
            color: item.color,
            color_name: item.colorName || '',
            image_url: item.img || '',
            memo: item.memo || '',
            updated_at: new Date().toISOString()
        };
        const { data, error } = await window.supabaseClient
            .from('closet_items')
            .update(updateData)
            .eq('id', itemId)
            .eq('user_id', window.currentUser.id)
            .select();
        if (error) {
            console.error('[Closet] Update error:', error);
            return { success: false, error: error.message };
        }
        console.log('[Closet] Updated in Supabase:', itemId);
        return { success: true, data };
    };

    window.deleteClosetItemFromSupabase = async function(itemId) {
        if (!window.currentUser) return { success: false };
        const { error } = await window.supabaseClient
            .from('closet_items')
            .delete()
            .eq('id', itemId)
            .eq('user_id', window.currentUser.id);
        if (error) {
            console.error('[Closet] Delete error:', error);
            return { success: false, error: error.message };
        }
        console.log('[Closet] Deleted from Supabase:', itemId);
        return { success: true };
    };

    // ===== プロフィール保存 (Supabase) =====
    window.saveProfileToSupabase = async function(profileData) {
        if (!window.currentUser) {
            console.error('[Profile] Not logged in');
            return { success: false, error: 'Not logged in' };
        }
        const updates = {
            username: profileData.name || profileData.username || '',
            avatar_emoji: profileData.avatar || '🧣',
            bio: profileData.bio || '',
            temp_preference: profileData.temp_preference || 'normal',
            styles: profileData.styles || [],
            avatar_url: profileData.photo || profileData.avatar_url || '',
            updated_at: new Date().toISOString()
        };
        console.log('[Profile] Sending to Supabase:', updates);
        const { data, error } = await window.supabaseClient
            .from('users')
            .update(updates)
            .eq('id', window.currentUser.id)
            .select();
        if (error) {
            console.error('[Profile] Save error:', error);
            return { success: false, error: error.message };
        }
        console.log('[Profile] Saved to Supabase:', data);
        return { success: true, data };
    };

    // ===== ログアウト =====
    window.logout = async function() {
        const confirmed = confirm('ログアウトしますか？');
        if (!confirmed) return;
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            alert('ログアウトに失敗しました。');
            return;
        }
        window.location.href = 'login.html';
    };

    // ===== エントリポイント =====
    // supabaseClient は index.html の inline script で同期生成済み。
    checkAuthGuard();
})();
