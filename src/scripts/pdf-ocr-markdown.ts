import { Mistral } from '@mistralai/mistralai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// 環境変数を読み込む
config();

// Mistral AI APIキーを取得（環境変数 MISTRAL_API_KEY を参照）
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
    console.error('MISTRAL_API_KEYが設定されていません。');
    process.exit(1);
}

const client = new Mistral({ apiKey });

async function convertPdfToMarkdownWithMistralOCR(pdfPath: string, fileName: string): Promise<string | null> {
    try {
        console.log(`PDFファイルの読み込みとアップロード中: ${pdfPath}`);
        
        // PDFファイルを読み込む
        const file = fs.readFileSync(pdfPath);

        // Mistralにファイルをアップロード
        const uploadedFile = await client.files.upload({
            file: {
                fileName: fileName + '.pdf', // ファイル名を指定
                content: file,
            },
            purpose: 'ocr',
        });
        console.log(`ファイルをアップロードしました: ID=${uploadedFile.id}`);

        // アップロードしたファイルの署名付きURLを取得
        const signedUrl = await client.files.getSignedUrl({
            fileId: uploadedFile.id,
        });
        console.log(`署名付きURLを取得しました`);

        // OCR処理を実行
        const ocrModel = 'mistral-ocr-latest'; // 使用するモデル名を定義
        console.log(`Mistral OCRモデル (${ocrModel}) に処理をリクエスト中...`);
        const ocrResponse = await client.ocr.process({
            model: ocrModel, // OCR専用モデルを指定
            document: {
                type: 'document_url',
                documentUrl: signedUrl.url,
            },
            includeImageBase64: false, // 画像データは含めない（今回はMarkdownのみが必要）
        });

        console.log('OCR処理が完了しました');
        
        if (ocrResponse.pages && ocrResponse.pages.length > 0) {
            let markdownOutput = '';
            for (const page of ocrResponse.pages) {
                markdownOutput += page.markdown + '\n\n'; // ページごとにMarkdownを結合
            }
            console.log(`合計${ocrResponse.pages.length}ページ分のMarkdownを抽出しました`);
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

// PDFをMarkdownに変換するメイン関数
async function convertPdfToMarkdown(pdfPath: string, outputPath?: string): Promise<string> {
  try {
    // ファイル名取得（拡張子なし）
    const fileName = path.basename(pdfPath, '.pdf');
    
    // PDFの存在確認
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDFファイルが見つかりません: ${pdfPath}`);
    }
    
    // ファイルサイズチェック
    const stats = fs.statSync(pdfPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`PDFファイルサイズ: ${fileSizeMB.toFixed(2)} MB`);
    
    // 大きすぎるファイルは警告
    if (fileSizeMB > 20) {
      console.warn(`警告: ファイルサイズが大きいため（${fileSizeMB.toFixed(2)} MB）、処理に時間がかかる可能性があります。`);
    }
    
    // Mistral OCRを使用してPDFをマークダウンに変換
    const markdown = await convertPdfToMarkdownWithMistralOCR(pdfPath, fileName);
    
    if (markdown === null) {
        throw new Error('Mistral OCRによるMarkdown変換に失敗しました');
    }
    
    // メタデータ情報を追加
    const metaData = `---
title: ${fileName}
date: ${new Date().toISOString().split('T')[0]}
source: PDF変換（Mistral OCR処理）
---

`;
    
    const finalMarkdown = metaData + markdown;
    
    // 出力パスが指定されている場合はファイルに保存
    if (outputPath) {
      fs.writeFileSync(outputPath, finalMarkdown, 'utf8');
      console.log(`マークダウンファイルを保存しました: ${outputPath}`);
    }
    
    return finalMarkdown;
  } catch (error) {
    console.error("PDF変換エラー:", error);
    throw error;
  }
}

// メイン実行関数
async function main() {
  try {
    // デフォルトのPDFファイルパス
    const defaultPdfPath = path.join(process.cwd(), 'pdf', 'yogaworks_guide202203-02.pdf');
    
    // コマンドライン引数からファイルパスを取得 (デフォルトのパスを設定)
    const pdfPath = process.argv[2] || defaultPdfPath;
    
    // 出力ファイル名を決定 (元のファイル名.md)
    const outputPath = process.argv[3] || path.join(
      process.cwd(),
      'output',
      `${path.basename(pdfPath, '.pdf')}_ocr.md`
    );
    
    // 出力ディレクトリが存在しない場合は作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`PDF -> Markdown OCR変換を開始します`);
    console.log(`入力ファイル: ${pdfPath}`);
    console.log(`出力ファイル: ${outputPath}`);
    
    const markdown = await convertPdfToMarkdown(pdfPath, outputPath);
    
    console.log('---------------------');
    console.log('変換完了!');
    console.log(`${path.basename(outputPath)} (${markdown.length} 文字) を生成しました`);
  } catch (error) {
    console.error("実行エラー:", error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にmain関数を実行
main(); 