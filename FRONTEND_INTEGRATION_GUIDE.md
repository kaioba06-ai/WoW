# Kion フロントエンド統合ガイド

**バックエンド実装完了** → フロントエンドチーム向けの統合手順書

---

## **📋 概要**

バックエンド（Supabase）の実装が完了しました。このドキュメントは、フロントエンドでバックエンドと連携するための手順をまとめています。

**実装期間:** 2026年4月11日～4月12日  
**バックエンド担当:** かいと 
**ステータス:** ✅ 本番環境デプロイ可能

---

## **📁 共有ファイル・情報**

### **1. API 仕様書**

```
プロジェクトフォルダ内:
├─ openapi.yaml      ← YAML形式（編集用）
└─ openapi.json      ← JSON形式（Postman用）
```

**確認方法:**
- **Swagger Editor:** https://editor.swagger.io → File → Import URL
- **Postman:** File → Import → openapi.json を選択

---

### **2. Supabase 認証情報**

```
【本番環境】

Project Name: WoW
Project URL:  https://bjqfmfiqzmwezlkjbgfn.supabase.co
Anon Public Key: sb_publishable_xxx...
  スプレッドシート進捗管理表（気温・服装）設計sheetより

Region: Asia Southeast (Tokyo)
Database: PostgreSQL
```

**.env ファイル例（フロント用）:**

```bash
# .env.local または .env.development
VITE_SUPABASE_URL=https://bjqfmfiqzmwezlkjbgfn.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx...
```

---

## **🎯 フロントエンドチームの実装タスク**

### **Phase 1: 環境構築（1日目）**

- [ ] `.env.local` に Supabase 認証情報を設定
- [ ] `supabase-js` ライブラリをインストール
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Supabase クライアントの初期化
  ```javascript
  // utils/supabase.js
  import { createClient } from '@supabase/supabase-js'
  
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  
  export default supabase
  ```

### **Phase 2: 認証フロー実装（2-3日目）**

- [ ] **Email サインアップ**
  ```javascript
  const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
  ```

- [ ] **Email ログイン**
  ```javascript
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
  ```

- [ ] **Google OAuth ログイン**
  ```javascript
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/home`
    }
  })
  ```

- [ ] **ログアウト**
  ```javascript
  await supabase.auth.signOut()
  ```

- [ ] **セッション管理**
  ```javascript
  const { data: { session } } = await supabase.auth.getSession()
  ```

### **Phase 3: ユーザー情報の保存・管理（2-3日目）**

**注意:** ユーザーがサインアップ後、自動的に `public.users` テーブルに行を作成する必要があります

```javascript
// utils/userManagement.js
export async function createUserProfile(userId, username) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      id: userId,
      email: user.email,
      username: username
    }])
  
  if (error) console.error('Error creating profile:', error)
  return data
}
```

**実装タイミング:**
- Email サインアップ後、メール確認前または後
- Google OAuth ログイン後

### **Phase 4: クローゼット機能実装（3-4日目）**

- [ ] **アイテム一覧取得**
  ```javascript
  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', userId)
  ```

- [ ] **アイテム追加**
  ```javascript
  const { data, error } = await supabase
    .from('closet_items')
    .insert([{
      user_id: userId,
      name: 'トレンチコート',
      category: 'jacket',
      color: 'beige',
      temp_range_min: 5,
      temp_range_max: 20
    }])
  ```

- [ ] **アイテム更新・削除**

### **Phase 5: コミュニティ機能実装（4-5日目）**

- [ ] **投稿一覧取得**
  ```javascript
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      user:users(id, username, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .range(0, 19)  // ページネーション
  ```

- [ ] **投稿作成**

- [ ] **いいね機能**

### **Phase 6: 統合テスト・デプロイ（5-6日目）**

- [ ] Postman でバックエンドが動作しているか確認
- [ ] フロント・バック統合テスト
- [ ] 本番環境へのデプロイ

---

## **⚠️ 重要な注意点**

### **1. JWT トークン管理**

```javascript
// ✅ 正しい方法
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// ❌ 避けるべき
localStorage.setItem('token', token)  // セキュリティリスク
```

**Supabase は自動的にトークンを管理します。明示的に保存する必要はありません。**

### **2. 認証の確認**

すべてのリクエストで認証状態を確認:

```javascript
// ミドルウェアの例
export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // ログイン画面へリダイレクト
    window.location.href = '/login'
  }
  return user
}
```

### **3. RLS（Row Level Security）について**

バックエンドで RLS ポリシーが設定されています。つまり：

- ✅ ユーザーは **自分のデータのみ** 操作可能
- ✅ コミュニティ投稿は **全員が閲覧可能**
- ✅ クローゼットは **自分のデータのみ閲覧可能**

**フロント側では認可チェックを重複実装する必要はありません。**

```javascript
// ✅ RLS が自動的に制御するので OK
const { data, error } = await supabase
  .from('closet_items')
  .select('*')
  .eq('user_id', someoneElsesUserId)  // 他人のデータは取得できない

// error.code = 'PGRST116' (権限なし)
```

### **4. エラーハンドリング**

```javascript
// 標準的なエラーチェック
const { data, error } = await supabase
  .from('closet_items')
  .select('*')

if (error) {
  console.error('Error:', error.message)
  console.error('Code:', error.code)  // PGRST116, 401, など
  
  // ユーザーに分かりやすいエラーメッセージを表示
  if (error.code === 'PGRST116') {
    showErrorMessage('アクセス権限がありません')
  } else if (error.code === '401') {
    showErrorMessage('ログインしてください')
  }
}
```

### **5. 画像アップロード**

クローゼットアイテムやプロフィール画像は Supabase Storage に保存:

```javascript
const { data, error } = await supabase.storage
  .from('closet-images')
  .upload(`${userId}/${Date.now()}-${file.name}`, file)

if (!error) {
  const { data: { publicUrl } } = supabase.storage
    .from('closet-images')
    .getPublicUrl(data.path)
  
  // publicUrl を DB に保存
}
```

### **6. リアルタイム機能**

コミュニティの「いいね数」などをリアルタイム更新したい場合:

```javascript
const subscription = supabase
  .from('community_posts')
  .on('*', payload => {
    console.log('Post updated:', payload)
  })
  .subscribe()

// クリーンアップ
subscription.unsubscribe()
```

---

## **🔐 セキュリティチェックリスト**

フロント実装前に確認してください：

- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] Anon Key（公開 Key）のみをフロントに設定
- [ ] Service Role Key は **サーバーサイドのみ** で使用
- [ ] JWT トークンは localStorage ではなく、Supabase に管理させる
- [ ] CORS 設定を確認（Supabase は自動で許可）
- [ ] パスワードバリデーション（8文字以上など）を実装

---

## **📞 トラブルシューティング**

### **Q1: "No API key found in request" エラー**

**原因:** Anon Key が設定されていない  
**解決:**
```bash
# .env.local を確認
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx...  # 正しく設定されているか
```

### **Q2: "401 Unauthorized" エラー**

**原因:** ログインしていない、またはトークンが期限切れ  
**解決:**
```javascript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  // ログイン画面へリダイレクト
}
```

### **Q3: "PGRST116" エラー（権限なし）**

**原因:** RLS ポリシーで アクセスが拒否されている  
**解決:**
- ユーザーが正しくログインしているか確認
- `user_id` が正しく設定されているか確認
- Supabase ダッシュボードで RLS ポリシーを確認

### **Q4: Google OAuth がリダイレクトループする**

**原因:** Redirect URI が正しくない  
**解決:**
```javascript
// 開発環境
redirectTo: 'http://localhost:5173/home'

// 本番環境
redirectTo: 'https://your-domain.com/home'
```

### **Q5: 画像がアップロードできない**

**原因:** Storage バケットへのアクセス権限がない  
**解決:**
```javascript
// Supabase ダッシュボード → Storage → closet-images
// Public を確認、または RLS ポリシーを確認
```

---

## **📊 データモデル確認**

### **Users テーブル**
```
id (UUID, PK)
email (TEXT, UNIQUE)
username (TEXT, UNIQUE)
avatar_url (TEXT, nullable)
bio (TEXT, nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### **Closet Items テーブル**
```
id (UUID, PK)
user_id (UUID, FK)
name (TEXT)
category (ENUM: jacket, pants, shoes, shirt, dress, skirt, accessories, underwear)
color (TEXT, nullable)
image_url (TEXT, nullable)
temp_range_min (INT, nullable)
temp_range_max (INT, nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### **Community Posts テーブル**
```
id (UUID, PK)
user_id (UUID, FK)
title (TEXT)
description (TEXT, nullable)
outfit_item_ids (UUID[], nullable)
image_url (TEXT, nullable)
temperature (FLOAT, nullable)
weather_desc (TEXT, nullable)
likes_count (INT, default: 0)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### **Likes テーブル**
```
id (UUID, PK)
user_id (UUID, FK)
post_id (UUID, FK)
created_at (TIMESTAMP)
UNIQUE(user_id, post_id)
```

---

## **📚 参考リンク**

- **Supabase 公式ドキュメント:** https://supabase.com/docs
- **supabase-js リファレンス:** https://supabase.com/docs/reference/javascript/introduction
- **API 仕様書:** `openapi.yaml` / `openapi.json`
- **OpenAPI ビューア:** https://editor.swagger.io

---

## **💬 質問・問題がある場合**

バックエンド担当に以下を共有してください：

1. エラーメッセージ（スクリーンショット）
2. 実装コード（該当部分）
3. 期待される動作 vs 実際の動作

---

## **✅ チェックリスト：統合開始前**

実装を開始する前に、以下を確認してください：

- [ ] API 仕様書（openapi.yaml）を読んだ
- [ ] Supabase 認証情報を `.env.local` に設定した
- [ ] `npm install @supabase/supabase-js` を実行した
- [ ] Postman で API が動作していることを確認した
- [ ] Supabase ダッシュボードでテーブルを確認した
- [ ] このドキュメントを熟読した

---

**Happy Coding! 🚀**

最初のコミットメッセージの案：
```
feat: integrate Supabase backend with frontend

- Set up supabase-js client
- Implement email authentication
- Implement Google OAuth login
- Connect to closet_items table
- Connect to community_posts table
```
