// js/postService.js

window.PostService = (() => {
    const getClient = () => window.supabaseClient;

    // ローカルストレージのプロフィールからユーザー名（ID代わり）を取得
    const getUserId = () => {
        try {
            const profile = JSON.parse(localStorage.getItem('kion_profile') || '{}');
            return profile.handle || 'anonymous';
        } catch {
            return 'anonymous';
        }
    };

    return {
        // 新規投稿を保存
        async savePost(postData) {
            const supabase = getClient();
            if (!supabase) return { success: false, error: 'Supabase client not initialized' };

            const { data, error } = await supabase
                .from('community_posts')
                .insert([{
                    user_name: getUserId(),
                    caption: postData.caption || '',
                    image_url: postData.imageUrl || null,
                    temperature: postData.temperature || null,
                    hashtags: postData.hashtags || [],
                    category: postData.category || 'standard',
                    genre: postData.genre || '',
                    scene: postData.scene || ''
                }])
                .select();

            if (error) throw error;
            return { success: true, data };
        },

        // 投稿一覧を取得
        async getPosts(page = 1, limit = 12, type = 'trending') {
            const supabase = getClient();
            if (!supabase) throw new Error('Supabase client not initialized');

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error } = await supabase
                .from('community_posts')
                // 【API節約】表示に必要なカラムのみを取得してペイロード(通信量)を削減
                .select('id, user_name, created_at, category, image_url, temperature, caption, hashtags')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // フロントの PostCard が期待するデータ構造にマッピング
            return data.map(p => ({
                id: p.id,
                user: p.user_name,
                userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user_name)}&background=random`,
                time: new Date(p.created_at).toLocaleDateString(),
                category: p.category,
                image: p.image_url,
                temperature: p.temperature,
                caption: p.caption,
                hashtags: p.hashtags,
                replies: 0,
                isNew: false,
                isExpanded: false
            }));
        },

        // 特定の投稿に対するリアクションの集計を取得
        async getReactionStats(postId) {
            const supabase = getClient();
            if (!supabase) return {};

            const { data, error } = await supabase
                .from('post_reactions')
                .select('reaction_type')
                .eq('post_id', postId);

            if (error) return {};

            const stats = {};
            data.forEach(r => {
                stats[r.reaction_type] = (stats[r.reaction_type] || 0) + 1;
            });
            return stats;
        },

        // リアクションを追加 (UPSERTで同一ユーザーの重複を防ぐ)
        async addReaction(postId, reactionType) {
            const supabase = getClient();
            if (!supabase) return { success: false };

            const userId = getUserId();
            const { error } = await supabase
                .from('post_reactions')
                .upsert({
                    post_id: postId,
                    user_id: userId,
                    reaction_type: reactionType
                }, { onConflict: 'post_id,user_id,reaction_type' });

            if (error) return { success: false, error };
            return { success: true };
        }
    };
})();