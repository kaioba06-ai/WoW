# Wear for Weather プロジェクト ルール

### 編集ルール

- **ページセクションを編集する場合は *.html の個別ファイルを直接編集してください。`index.html` は編集しないでください。**
- `index.html` を編集するのは、共通ヘッダー・共通ナビゲーション・外部スクリプトの読み込み設定のみです。
- JavaScript ロジックは `js/` フォルダ内の各ファイル（`app.js`, `ui.js`, `weather.js`, `closet.js`, `profile.js` 等）に機能別に分割されています。

### 読み込み仕組み

`js/app.js` 内の初期化ロジックが `fetch()` を利用して各セクション（home.html, profile.html 等）を `index.html` 内のコンテナへ動的に読み込みます。読み込み完了は `sectionsLoaded` カスタムイベントで通知されます。

### 普遍的開発・運用コマンド (Universal Engineering Commands)

[cite_start]いかなる機能追加・変更時も、以下のエンジニアリング・パターンを「標準コマンド」として適用すること [cite: 1]。

#### 1. 非同期ライフサイクルの同期 (Hydration)
- [cite_start]**DOM 待機**: loadSections() による注入完了を待たずにロジックを実行しないこと。必ず初期化関数をトリガーとする [cite: 1]。
- [cite_start]**存在チェック**: 操作前に document.querySelector の戻り値が null でないことを確認するガード句を徹底すること [cite: 1]。

#### 2. 状態の単一方向フロー (Data Flow)
- [cite_start]**信頼できる情報源**: ユーザー設定や衣服データは、DOMからではなく常に localStorage または weather.js の計算結果を正とすること [cite: 1]。
- [cite_start]**UI 同期**: データ更新時は、該当コンポーネントの描画関数を呼び出し、UIを再構築するパターンを維持すること [cite: 1]。

#### 3. イベント管理の純粋性 (Event Integrity)
- [cite_start]**二重登録の防止**: タブ切り替え時のメモリリークを防ぐため、登録前に removeEventListener を行うか、初期化フラグで管理すること [cite: 1]。
- [cite_start]**イベント委譲**: 動的要素へのリスナー管理を簡略化するため、可能な限り親コンテナでのイベント委譲を活用すること [cite: 1]。

#### 4. セッション復帰と整合性 (Resilience)
- [cite_start]**状態監査**: 中断からの復帰時、`files.md` の定義と現在のファイル構成を照合し、不適切な配置や構文エラーを自動修復すること [cite: 1]。
- [cite_start]**アトミック更新**: 1つのコンポーネントが「Working State（作動可能状態）」であることを確認してから、次の機能実装へ進むこと [cite: 1]。