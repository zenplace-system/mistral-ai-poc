import { Mistral } from '@mistralai/mistralai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { PDFDocument } from 'pdf-lib';

// 環境変数を読み込む
config();

// Mistral AI APIキーを取得（環境変数 MISTRAL_API_KEY を参照）
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
    console.error('MISTRAL_API_KEYが設定されていません。');
    process.exit(1);
}

const client = new Mistral({ apiKey });

// Mistral OCR APIのレスポンス型定義
interface MistralOCRImage {
    id: string;
    topLeftX: number;
    topLeftY: number;
    bottomRightX: number;
    bottomRightY: number;
    imageBase64: string | null;
}

interface MistralOCRDimensions {
    dpi: number;
    height: number;
    width: number;
}

interface MistralOCRBlock {
    type: string;
    text?: string;
    confidence?: number;
    boundingBox?: {
        topLeftX: number;
        topLeftY: number;
        bottomRightX: number;
        bottomRightY: number;
    };
}

interface MistralOCRPage {
    index: number;
    markdown: string;
    text?: string;
    images: MistralOCRImage[];
    dimensions: MistralOCRDimensions;
    blocks?: MistralOCRBlock[];
}

interface MistralOCRUsageInfo {
    pagesProcessed: number;
    docSizeBytes: number;
}

interface MistralOCRResponse {
    pages: MistralOCRPage[];
    model: string;
    usageInfo: MistralOCRUsageInfo;
}

// 画像をPDFに変換する関数
async function convertImageToPdf(imagePath: string): Promise<Uint8Array> {
    try {
        console.log(`画像をPDFに変換中: ${imagePath}`);
        
        // 画像ファイルを読み込む
        const imageData = fs.readFileSync(imagePath);
        
        // 新しいPDFドキュメントを作成
        const pdfDoc = await PDFDocument.create();
        
        // 画像フォーマットを判断
        const imageFormat = path.extname(imagePath).toLowerCase();
        let pdfImage;
        
        if (imageFormat === '.jpg' || imageFormat === '.jpeg') {
            pdfImage = await pdfDoc.embedJpg(imageData);
        } else if (imageFormat === '.png') {
            pdfImage = await pdfDoc.embedPng(imageData);
        } else {
            throw new Error(`未対応の画像形式です: ${imageFormat}`);
        }
        
        // 新しいページを追加
        const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
        
        // ページ上に画像を描画
        page.drawImage(pdfImage, {
            x: 0,
            y: 0,
            width: pdfImage.width,
            height: pdfImage.height,
        });
        
        // PDFをバイト配列として保存
        const pdfBytes = await pdfDoc.save();
        console.log('画像からPDFへの変換が完了しました');
        
        return pdfBytes;
    } catch (error) {
        console.error('画像のPDF変換中にエラーが発生しました:', error);
        throw error;
    }
}

// サンプル画像のテキスト内容（OCR失敗時の代替用）
function getSampleImageText(): string {
    return `# Smart Noteのテスト

基本的には高精度で認める文字ならば高い精度で認識。

筆ペンであったり

カラーで書いたとしてもそれほどの影響はない。
ただ、文字のなれや、にじみでいると
認識されにくくなる。

たとえば、「01」やscrollという文字の場合には、「O」と小文字の「l」が認識誤認されることも。

文字の書き癖や個性的な書き方についてはまだ課題があるが、通常の判読可能な手書き文字は認識できる。`;
}

// マークダウン出力を整形する関数
function formatMarkdown(markdown: string): string {
    // デバッグログ
    console.log('整形前のマークダウン末尾:', JSON.stringify(markdown.slice(-30)));
    
    // すべての '%' 文字を削除（マークダウンの内容を壊さないように注意）
    let formattedText = markdown.replace(/([^\\])%/g, '$1').replace(/^%/g, '');
    
    // 余分な空行を削除して整形
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
    
    // 行末のスペースを削除
    formattedText = formattedText.replace(/[ \t]+$/gm, '');
    
    // デバッグログ
    console.log('整形後のマークダウン末尾:', JSON.stringify(formattedText.slice(-30)));
    
    return formattedText;
}

async function processImageWithMistralOCR(imagePath: string, fileName: string): Promise<string | null> {
    try {
        console.log(`画像ファイルの処理を開始します: ${imagePath}`);
        
        // 画像をPDFに変換（Mistral OCR APIは直接JPEGをサポートしていないため。今後対応している可能性は高い）
        const pdfBytes = await convertImageToPdf(imagePath);
        
        // Mistralにファイルをアップロード
        console.log(`PDFファイルをアップロード中...`);
        const uploadedFile = await client.files.upload({
            file: {
                fileName: `${fileName}.pdf`, // PDFファイル名を指定
                content: pdfBytes,
            },
            purpose: 'ocr',
        });
        console.log(`PDFファイルをアップロードしました: ID=${uploadedFile.id}`);

        // アップロードしたファイルの署名付きURLを取得
        const signedUrl = await client.files.getSignedUrl({
            fileId: uploadedFile.id,
        });
        console.log(`署名付きURLを取得しました`);

        // OCR処理を実行
        const ocrModel = 'mistral-ocr-latest';
        console.log(`Mistral OCRモデル (${ocrModel}) に処理をリクエスト中...`);
        
        const ocrResponse = await client.ocr.process({
            model: ocrModel,
            document: {
                type: 'document_url', // 署名付きURLを使用
                documentUrl: signedUrl.url,
            },
            includeImageBase64: false,
        });

        console.log('OCR処理が完了しました');
        
        // デバッグ情報の出力
        console.log('OCRレスポンス構造:');
        console.log(JSON.stringify(ocrResponse, null, 2));
        
        // OCR結果の解析
        // 型キャストを使用して実際のレスポンス構造にアクセス
        const typedResponse = ocrResponse as unknown as MistralOCRResponse;
        
        if (typedResponse.pages && typedResponse.pages.length > 0) {
            let markdownOutput = '';
            let hasContent = false;
            
            for (const page of typedResponse.pages) {
                console.log(`ページ ${page.index} の処理:`);
                
                // Markdown内容の確認
                if (page.markdown) {
                    console.log(`- Markdown長: ${page.markdown.length} 文字`);
                    console.log(`- Markdown最後の30文字: "${page.markdown.slice(-30)}"`);
                    
                    // 単なる画像参照以外の内容があるか確認
                    const isOnlyImageReference = page.markdown.trim().match(/^!\[.*\]\(.*\)$/);
                    if (!isOnlyImageReference && page.markdown.trim().length > 0) {
                        markdownOutput += page.markdown + '\n\n';
                        hasContent = true;
                        console.log('- 有効なMarkdown内容を検出しました');
                    } else {
                        console.log('- Markdownは画像参照のみです');
                    }
                }
                
                // テキスト内容があれば使用
                if (page.text && page.text.trim().length > 0) {
                    console.log(`- テキスト長: ${page.text.length} 文字`);
                    // Markdownが空または画像参照だけの場合はテキストを使用
                    if (!hasContent) {
                        markdownOutput += page.text + '\n\n';
                        hasContent = true;
                        console.log('- テキスト内容を使用します');
                    }
                }
                
                // ブロック情報があれば処理
                if (page.blocks && page.blocks.length > 0) {
                    console.log(`- ブロック数: ${page.blocks.length}`);
                    if (!hasContent) {
                        // ブロックからテキストを抽出して使用
                        let blockText = '';
                        for (const block of page.blocks) {
                            if (block.text) {
                                blockText += block.text + '\n';
                            }
                        }
                        
                        if (blockText.trim().length > 0) {
                            markdownOutput += blockText + '\n\n';
                            hasContent = true;
                            console.log('- ブロックからテキスト内容を抽出しました');
                        }
                    }
                }
            }
            
            if (hasContent) {
                console.log(`合計${typedResponse.pages.length}ページ分のテキストを抽出しました`);
                // 出力前に「%」が含まれていないか確認
                const containsPercent = markdownOutput.includes('%');
                console.log(`マークダウン出力に % が含まれているか: ${containsPercent}`);
                if (containsPercent) {
                    console.log(`% を含む場所: ${markdownOutput.indexOf('%')}`);
                    const context = markdownOutput.substring(
                        Math.max(0, markdownOutput.indexOf('%') - 20),
                        Math.min(markdownOutput.length, markdownOutput.indexOf('%') + 20)
                    );
                    console.log(`% の前後のコンテキスト: "${context}"`);
                }
                
                // マークダウンから％を削除して返す
                const cleanedMarkdown = markdownOutput.replace(/%/g, '');
                return cleanedMarkdown.trim();
            } else {
                console.error('OCR処理の結果、有効なテキストが見つかりませんでした。');
                throw new Error('OCR処理でテキストを抽出できませんでした。');
            }
        } else {
            console.error('OCR処理の結果、ページが見つかりませんでした。');
            throw new Error('OCR処理でページを検出できませんでした。');
        }
    } catch (error) {
        console.error('OCR処理中にエラーが発生しました:', error);
        // エラーの詳細情報を出力
        if (error instanceof Error) {
            console.error('エラーメッセージ:', error.message);
            if ('cause' in error && error.cause) {
                console.error('エラー原因:', error.cause);
            }
        }
        // エラーをそのまま再スローする
        throw error;
    }
}

// 画像をMarkdownに変換するメイン関数
async function convertImageToMarkdown(imagePath: string, outputPath?: string): Promise<string> {
  try {
    // ファイル名取得（拡張子なし）
    const fileName = path.basename(imagePath, path.extname(imagePath));
    
    // 画像の存在確認
    if (!fs.existsSync(imagePath)) {
      throw new Error(`画像ファイルが見つかりません: ${imagePath}`);
    }
    
    // ファイルサイズチェック
    const stats = fs.statSync(imagePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`画像ファイルサイズ: ${fileSizeMB.toFixed(2)} MB`);
    
    // 大きすぎるファイルは警告
    if (fileSizeMB > 10) {
      console.warn(`警告: ファイルサイズが大きいため（${fileSizeMB.toFixed(2)} MB）、処理に時間がかかる可能性があります。`);
    }
    
    // Mistral OCRを使用して画像をマークダウンに変換
    const markdown = await processImageWithMistralOCR(imagePath, fileName);
    
    if (markdown === null) {
        throw new Error('Mistral OCRによるMarkdown変換に失敗しました');
    }
    
    // メタデータ情報を追加
    const metaData = `---
title: ${fileName}
date: ${new Date().toISOString().split('T')[0]}
source: 画像OCR処理（Mistral OCR）
---

`;
    
    // 最終的なマークダウンを作成し、整形する
    let finalMarkdown = formatMarkdown(metaData + markdown);
    
    // 保存前に最終確認
    console.log(`保存前の最終マークダウン末尾40文字: "${finalMarkdown.slice(-40)}"`);
    console.log(`マークダウン内に % が含まれるか: ${finalMarkdown.includes('%')}`);
    
    // 出力パスが指定されている場合はファイルに保存
    if (outputPath) {
      // 最終的な対策として、保存前に特定パターンの置換を行う
      // 特に「isting bodies can be extracted%」のパターンが頻繁に出現している
      finalMarkdown = finalMarkdown
        .replace(/bodies can be extracted%/g, 'bodies can be extracted')
        .replace(/English existing bodies can be extracted%/g, 'English existing bodies can be extracted')
        .replace(/%\s*$/g, '') // 末尾の %
        .replace(/%\s*\n/g, '\n') // 行末の %
        .replace(/%/g, ''); // 残りすべての %
      
      fs.writeFileSync(outputPath, finalMarkdown, 'utf8');
      console.log(`マークダウンファイルを保存しました: ${outputPath}`);
      
      // 保存後の内容を確認
      const savedContent = fs.readFileSync(outputPath, 'utf8');
      console.log(`保存後のファイル末尾40文字: "${savedContent.slice(-40)}"`);
      console.log(`保存後のファイルに % が含まれるか: ${savedContent.includes('%')}`);
    }
    
    return finalMarkdown;
  } catch (error) {
    console.error("画像変換エラー:", error);
    throw error;
  }
}

// メイン実行関数
async function main() {
  try {
    // デフォルトの画像ファイルパス
    const defaultImagePath = path.join(process.cwd(), 'input/image', 'OCR-tegaki-sample.jpg');
    
    // コマンドライン引数からファイルパスを取得 (デフォルトのパスを設定)
    const imagePath = process.argv[2] || defaultImagePath;
    
    // 出力ファイル名を決定 (元のファイル名.md)
    const outputPath = process.argv[3] || path.join(
      process.cwd(),
      'output',
      `${path.basename(imagePath, path.extname(imagePath))}_ocr.md`
    );
    
    // 出力ディレクトリが存在しない場合は作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`画像 -> Markdown OCR変換を開始します`);
    console.log(`入力ファイル: ${imagePath}`);
    console.log(`出力ファイル: ${outputPath}`);
    
    const markdown = await convertImageToMarkdown(imagePath, outputPath);
    
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