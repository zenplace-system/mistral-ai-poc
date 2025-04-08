# Mistral AI 利用サンプル

このドキュメントは、開発チームがOpenRouterプラットフォームおよびMistral AI公式APIを通じてMistral AIモデルを利用するためのガイドです。

## 概要

このプロジェクトには、以下の方法でMistral AIモデルを利用するためのサンプルスクリプトが含まれています。

1.  **OpenRouter経由:** 様々なLLMプロバイダーのAPIを統一インターフェースで利用できるOpenRouterプラットフォームを使用します。
2.  **Mistral AI公式API経由:** Mistral AIが提供する公式API（SDK含む）を直接利用します。特にOCR機能を利用する場合はこちらが必要です。

## 必要なもの：APIキー

利用するスクリプトに応じて、以下のAPIキーが必要です。

### 1. OpenRouter APIキー (`OPENROUTER_API_KEY`)

*   **使用スクリプト:** `mistral:sample`
*   **取得手順:**
    1.  [OpenRouter](https://openrouter.ai/) にアクセスし、アカウントを作成またはログインします。
    2.  ダッシュボードの [Keysページ](https://openrouter.ai/keys) に移動します。
    3.  「Create Key」ボタンをクリックし、キーに名前を付け（例: `mistral-poc-key`）、必要に応じてクレジット制限を設定します。
    4.  生成されたAPIキーをコピーします。
    5.  **取得したキーを `.env` ファイルに `OPENROUTER_API_KEY=コピーしたキー` の形式で設定してください。**

### 2. Mistral AI APIキー (`MISTRAL_API_KEY`)

*   **使用スクリプト:** `mistral:pdf-ocr`
*   **取得手順:**
    1.  [Mistral AIプラットフォーム](https://console.mistral.ai/) にアクセスし、アカウントを作成またはログインします。
    2.  左側のメニューから「API Keys」を選択します。
    3.  「Create new key」ボタンをクリックし、キーに名前を付け（例: `mistral-poc-ocr-key`）、適切な権限（例: `ocr.read`, `files.read`, `files.write` など、SDKの利用に必要な権限）を選択します。
    4.  生成されたAPIキーをコピーします（**注意: このキーは一度しか表示されません**）。
    5.  **取得したキーを `.env` ファイルに `MISTRAL_API_KEY=コピーしたキー` の形式で設定してください。**

**APIキーの管理に関する注意:**
*   APIキーは機密情報です。安全に保管し、第三者と共有しないでください。
*   コード内に直接APIキーを記述せず、必ず `.env` ファイルを使用して環境変数として管理してください。
*   `.env` ファイルは `.gitignore` に追加し、Gitリポジトリにコミットしないようにしてください。

## セットアップ

### 1. APIキーのセットアップ

プロジェクトのルートディレクトリに `.env` ファイルを作成（または編集）し、上記の手順で取得したAPIキーを以下のように設定します：

```
OPENROUTER_API_KEY=あなたのOpenRouterAPIキー
MISTRAL_API_KEY=あなたのMistralAIのAPIキー
```

### 2. 依存関係のインストール

[Bun](https://bun.sh/) を使用して依存関係をインストールします。

```bash
bun install
```

## スクリプトの実行 (`bun run`)

`package.json` の `scripts` セクションに定義された以下のスクリプトを実行できます。

### `bun run mistral:sample [プロンプト]`

*   **実行ファイル:** `src/scripts/mistral-sample.ts`
*   **機能:** OpenRouter経由でMistral AIモデル（例: `mistral-7b-instruct`）に指定したプロンプト（またはデフォルトのプロンプト）を送信し、応答を表示します。
*   **必要なAPIキー:** `OPENROUTER_API_KEY`
*   **例:**
    ```bash
    # デフォルトプロンプトで実行
    bun run mistral:sample

    # カスタムプロンプトで実行
    bun run mistral:sample "日本の首都は？"
    ```

### `bun run mistral:pdf-ocr [PDFファイルパス] [出力ファイルパス]`

*   **実行ファイル:** `src/scripts/pdf-ocr-markdown.ts`
*   **機能:** Mistral AI公式APIとOCRモデル (`mistral-ocr-latest`) を使用して、PDFファイルの内容（テキストおよび画像内の文字）を読み取り、構造化されたMarkdown形式で出力します。
*   **特徴:** **画像ベースのPDFにも対応可能**です。
*   **必要なAPIキー:** `MISTRAL_API_KEY`
*   **例:**
    ```bash
    # デフォルトPDF (pdf/yogaworks_guide202203-02.pdf) を処理
    bun run mistral:pdf-ocr

    # 特定のPDFを指定して処理し、出力を指定
    bun run mistral:pdf-ocr path/to/your.pdf output/result_ocr.md
    ```

## API利用時の注意点

*   **コスト管理:** OpenRouterおよびMistral AIは利用量に応じて課金されます。各プラットフォームのダッシュボードで利用状況を確認し、無駄なAPIコールを避けるようにしてください。
*   **レートリミット:** モデルやアカウントの状況に応じてレートリミットが存在する場合があります。APIリファレンスやエラーメッセージを確認してください。
*   **エラーハンドリング:** APIリクエストが失敗する場合（認証エラー、無効なモデル名、レートリミット超過など）に備え、適切なエラーハンドリングを実装してください。

## 参考情報

*   [OpenRouter 公式サイト](https://openrouter.ai/)
*   [OpenRouter モデル一覧](https://openrouter.ai/models)
*   [Mistral AI Platform](https://console.mistral.ai/)
*   [Mistral AI Documentation](https://docs.mistral.ai/)
*   [Mistral AI TypeScript SDK](https://github.com/mistralai/client-js)
