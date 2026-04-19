# Kion Project: File Map & Navigation Guide

## 1. Core System Files
| File | Role | Responsibility Boundaries |
| :--- | :--- | :--- |
| **index.html** | Main Shell | 全タブ共通のナビ、モーダル、トーストコンテナの保持。タブ固有のHTMLは記述禁止。 |
| **app.js** | Orchestrator | セクションの動的ロード (loadSections)、共通ユーティリティ (showToast)。 |
| **ui.js** | UI Controller | タブ切り替え、スワイプ、ダークモード等のグローバルUX制御。 |
| **styles.css** | Global Design | Tailwind外のカスタムアニメーション（リアクション演出等）の定義。 |

## 2. Intelligence & Context
| File | Role | Responsibility Boundaries |
| :--- | :--- | :--- |
| **weather.js** | Logic Engine | 気象API取得、**My指数（体感補正）**の算出。Weekly画面の描画データ生成。 |
| **scene.js** | Context Layer | 移動手段・場所に応じた補正係数の管理。背景アセットの定義。 |

## 3. Tab-Specific Components
| File | Role | Feature Focus |
| :--- | :--- | :--- |
| **home.html/js** | Today's Action | 「今」の最適解を提示。My指数のフィードバック（学習）ボタン。 |
| **weekly.html** | Planning Deck | 7日間の服装計画。weather.js と連携した予報カードの表示。 |
| **closet.html/js** | Asset Database | localStorage (kion_closet_items) のCRUD。カテゴリ・色検索。 |
| **discover.html** | Discovery View | タイムラインUI。コミュニティ投稿の閲覧。 |
| **community.js** | Reaction Logic | 投稿データ処理、および巨大絵文字によるリアクション演出の実装。 |
| **profile.html/js** | User Settings | 暑がり/寒がりの設定、Scene（移動動線）の管理。 |

## 4. Strict Constraints
- **No Index-Overload:** index.html にタブ固有のロジックやHTMLを直接書き込まない。
- **Health x Style:** 「おしゃれは我慢」を徹底排除するロジックを優先する。

## 5. 開発・変更運用ポリシー (Development Policy)
今後、本プロジェクトにおけるすべての追加機能の実装、および既存コードの変更は、以下の原則に厳格に従うこと。

### ① ファイル責務の絶対遵守 (Strict Boundaries)
* **Logic Isolation:** 計算ロジック（`weather.js`）に DOM 操作を混入させない。データを受け取り、計算結果を返す責務に徹する。
* **Shell Purity:** `index.html` に特定のタブ専用の HTML やロジックを直接追加しない。変更は必ず各タブの `.html` / `.js` で行う。

### ② コンポーネント指向の維持 (Component First)
* **UI の追加:** 該当セクションの `.html` を編集し、スタイルは Tailwind または `styles.css` を利用する。
* **非同期ロードの考慮:** `loadSections()` 後の初期化（`init` 関数）の流れを維持し、要素未存在エラーを徹底的に防ぐ。

### ③ ユーザー体験とロジックの優先順位 (UX Priority)
* **Health x Style:** 推奨ロジック変更時は、「おしゃれは我慢」を排除し、個人の体感（暑がり・寒がり）を最優先する。
* **Emotional Delight:** リアクション演出（巨大絵文字の落下等）は、`community.js` と `styles.css` のアニメーション定義に従って実装する。

### ④ 変更時の自動チェック要件 (Self-Audit)
変更・追加後、CLIツール（LLM）は以下のチェックを自動実行すること。
1. **Index 汚染確認:** `index.html` が軽量なシェルの状態を維持しているか。
2. **整合性確認:** タブ切り替え時のイベントリスナーが正常に動作し、二重登録（メモリリーク）を起こしていないか。