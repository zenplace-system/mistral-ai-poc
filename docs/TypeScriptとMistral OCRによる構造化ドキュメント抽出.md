TypeScriptで`mistral-ocr-latest`を使用してPDFなどの文書からテキストと構造化されたコンテンツを抽出し、ヘッダー、段落、リスト、テーブルといった書式を保持したままMarkdown形式で結果を出力するプログラムの作成手順を説明書としてmarkdownで提供します。

```markdown
# TypeScriptとMistral OCRによる構造化ドキュメント抽出

この説明書では、TypeScriptとMistral AIの高性能OCRモデルである`mistral-ocr-latest`を使用して、PDFなどのドキュメントからテキストコンテンツと構造情報を抽出し、Markdown形式で出力する手順について解説します。これにより、文書のレイアウトを維持しつつ、プログラムから再利用しやすい形式で情報を取り出すことが可能になります。

## 1. はじめに

多くのドキュメントはPDFなどの非構造化形式で保存されており、内容の再編集やAIによる解析が困難な場合があります。`mistral-ocr-latest`は、高度なOCR（光学文字認識）技術とAI（LLMやビジョンモデル）を組み合わせることで、**テキストだけでなく、見出し、段落、リスト、表、グラフなどの構造を正確に認識し、Markdown形式で出力することに特化**しています。Markdownは、プレーンテキストでありながら、構造を表現するための記号が用意されているため、LLMなどのAIツールとの連携も容易です。

TypeScriptを使用することで、**型安全性を確保しつつ、効率的で保守性の高いOCR処理プログラムを開発**できます。

## 2. 準備

プログラムを作成する前に、以下の準備が必要です。

*   **Node.jsとnpm (または yarn):** TypeScriptの実行環境とパッケージ管理ツールが必要です。
*   **TypeScript:** プログラミング言語としてTypeScriptを使用します。
*   **Mistral AI APIキー:** Mistral OCR APIを利用するために必要です。Mistral AIのプラットフォームでAPIキーを取得してください。

## 3. プロジェクトのセットアップ

1.  **新しいプロジェクトディレクトリを作成**し、そのディレクトリに移動します。

    ```bash
    mkdir mistral-ocr-typescript
    cd mistral-ocr-typescript
    ```

2.  **npm (または yarn) を使用してプロジェクトを初期化**します。

    ```bash
    npm init -y
    # または
    yarn init -y
    ```

3.  **TypeScriptとMistral AIのTypeScript SDKをインストール**します。

    ```bash
    npm install typescript @mistralai/mistralai --save
    # または
    yarn add typescript @mistralai/mistralai
    ```

4.  **TypeScriptの設定ファイル (`tsconfig.json`) を作成**します。

    ```bash
    npx tsc --init
    # または
    yarn tsc --init
    ```

    必要に応じて、`tsconfig.json`の内容を調整してください。

## 4. OCR処理プログラムの作成

新しいTypeScriptファイル（例：`ocr.ts`）を作成し、以下のコードを記述します。

```typescript
import { Mistral } from '@mistralai/mistralai';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数からAPIキーを取得することを推奨します
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
    console.error('MISTRAL_API_KEYが設定されていません。');
    process.exit(1);
}

const client = new Mistral({ apiKey });

async function processDocument(documentPath: string): Promise<string | null> {
    try {
        const file = fs.readFileSync(documentPath);
        const filename = path.basename(documentPath);

        // Mistralにファイルをアップロード
        const uploadedFile = await client.files.upload({
            file: {
                fileName: filename,
                content: file,
            },
            purpose: 'ocr',
        });

        // アップロードしたファイルの署名付きURLを取得
        const signedUrl = await client.files.getSignedUrl({
            fileId: uploadedFile.id,
        });

        // OCR処理を実行
        const ocrResponse = await client.ocr.process({
            model: 'mistral-ocr-latest',
            document: {
                type: 'document_url',
                documentUrl: signedUrl.url,
            },
            includeImageBase64: true, // 画像のBase64データを含める場合
        });

        if (ocrResponse.pages && ocrResponse.pages.length > 0) {
            let markdownOutput = '';
            for (const page of ocrResponse.pages) {
                markdownOutput += page.markdown + '\n\n';
                // 画像データがBase64で含まれている場合は保存することも可能です
                if (page.images) {
                    const outputDir = 'output_images';
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir);
                    }
                    for (const image of page.images) {
                        const imagePath = path.join(outputDir, `${image.id}.png`);
                        const base64Data = image.image_base64?.split(',');
                        if (base64Data) {
                            fs.writeFileSync(imagePath, base64Data, 'base64');
                            // Markdown内の画像参照を更新することもできます
                            // 例: markdownOutput = markdownOutput.replace(`![${image.id}](${image.id})`, `![${image.id}](output_images/${image.id}.png)`);
                        }
                    }
                }
            }
            return markdownOutput.trim();
        } else {
            console.warn('OCR処理の結果、ページが見つかりませんでした。');
            return null;
        }
    } catch (error) {
        console.error('OCR処理中にエラーが発生しました:', error);
        return null;
    }
}

async function main() {
    const documentPath = 'path/to/your/document.pdf'; // 処理したいドキュメントのパス
    const markdownResult = await processDocument(documentPath);

    if (markdownResult) {
        const outputPath = 'output.md';
        fs.writeFileSync(outputPath, markdownResult, 'utf-8');
        console.log(`OCR結果を ${outputPath} に保存しました。`);
    }
}

main().catch(console.error);
```

**コードの説明:**

1.  `@mistralai/mistralai` から `Mistral` クラスをインポートし、Mistral OCR APIクライアントを作成します。**APIキーは環境変数から取得することを推奨**します。
2.  `processDocument` 関数は、**指定されたパスのドキュメントを読み込み**ます。
3.  `client.files.upload` を使用して、**ローカルのドキュメントファイルをMistralのサーバーにアップロード**します。`purpose` を `'ocr'` に設定します。
4.  `client.files.getSignedUrl` で、**アップロードしたファイルへの署名付きURLを取得**します。
5.  `client.ocr.process` を呼び出し、**OCR処理を実行**します。
    *   `model` パラメータには `'mistral-ocr-latest'` を指定します。
    *   `document` パラメータには、`type: 'document_url'` と取得した `documentUrl` を設定します。
    *   `includeImageBase64: true` を設定すると、**OCR処理されたページの画像データがBase64エンコードされてレスポンスに含まれ**ます。
6.  OCR処理の結果 (`ocrResponse`) の `pages` プロパティをループ処理し、各ページの `markdown` を結合してMarkdown形式の出力を作成します。
7.  画像データが含まれている場合は、Base64データをデコードして画像ファイルとして保存する処理も含まれています。必要に応じて、Markdown内の画像参照を更新することも可能です。
8.  最終的なMarkdown形式のテキストをファイルに保存します。
9.  `main` 関数で、処理したいドキュメントのパスを指定し、`processDocument` 関数を呼び出します。

## 5. プログラムの実行

1.  作成した `ocr.ts` ファイルをTypeScriptコンパイラでJavaScriptにコンパイルします。

    ```bash
    npx tsc ocr.ts
    # または
    yarn tsc ocr.ts
    ```

2.  生成された `ocr.js` ファイルを実行します。**実行前に、環境変数 `MISTRAL_API_KEY` にあなたのAPIキーを設定**してください。

    ```bash
    export MISTRAL_API_KEY="your_mistral_api_key"
    node ocr.js
    ```

    Windowsの場合は、以下のように設定します。

    ```bash
    set MISTRAL_API_KEY="your_mistral_api_key"
    node ocr.js
    ```

    または、`.env` ファイルなどを使用して環境変数を管理することも推奨されます。

## 6. 結果の確認と注意点

プログラムが正常に実行されると、`output.md` ファイルに**抽出されたテキストが元の文書構造を可能な限り保持したMarkdown形式で保存**されます。

*   `mistral-ocr-latest` は**高い認識精度**を持ち、**表や数式、複雑なレイアウトの文書**も比較的得意としています。
*   日本語の文書でも**基本的な精度は高い**と報告されています。
*   ただし、**特殊なフォントや非常に複雑なレイアウト**の場合、構造認識に**ムラ**が出たり、期待通りに解析できない可能性もあります。
*   画像として扱われた部分や、構造が複雑で認識が難しい箇所は、完全な構造化が難しい場合があります。

## 7. まとめ

この手順に従うことで、TypeScriptと`mistral-ocr-latest`を組み合わせて、PDFなどのドキュメントから構造化されたテキストデータをMarkdown形式で抽出するプログラムを作成できます。これにより、文書データの有効活用とAI連携の可能性が大きく広がります。必要に応じて、エラーハンドリングの追加や、より複雑な後処理などを実装してください。
```