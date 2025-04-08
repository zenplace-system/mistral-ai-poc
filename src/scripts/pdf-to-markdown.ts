import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import { config } from 'dotenv';

// 環境変数を読み込む
config();

// 型定義
interface Message {
  role: string;
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: Message[];
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
    index: number;
  }[];
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// PDFからテキストを抽出する関数
async function extractTextFromPdf(pdfPath: string): Promise<{text: string, pages: number}> {
  console.log(`PDFファイル読み込み中: ${pdfPath}`);
  
  // PDFファイルを読み込む
  const dataBuffer = fs.readFileSync(pdfPath);
  
  // PDFをパースする（デバッグモードをオフに設定）
  const options = { 
    pagerender: undefined,
    max: 0,
    version: '1.10.100' // バージョン指定によりデバッグモードを無効化
  };
  
  const data = await pdfParse(dataBuffer, options);
  
  return {
    text: data.text,
    pages: data.numpages
  };
}

// Mistral AIを使ってテキストをマークダウンに変換する関数
async function convertToMarkdownWithMistralAI(text: string, fileName: string): Promise<string> {
  // 環境変数からAPIキーを取得
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEYが設定されていません。.envファイルを確認してください。');
  }
  
  // 使用するMistral AIモデル
  const modelName = "mistralai/mistral-large"; // または "mistralai/mistral-7b-instruct"
  
  // プロンプトの作成
  const prompt = `
以下はPDFから抽出したテキストです。このテキストを整形して、マークダウン形式に変換してください。
- 見出し、小見出しを適切に識別して # や ## を付けてください
- 箇条書きリストは - や * 形式に統一してください
- 段落は適切に分割してください
- テーブルがあれば、マークダウン形式のテーブルに変換してください
- 目次があれば、適切にフォーマットしてください
- マークダウン以外の追加的な説明は含めないでください
- 元のテキストの内容を変えず、フォーマットだけを変更してください

PDFファイル名: ${fileName}

抽出テキスト:
${text}
`;

  try {
    console.log('Mistral AIにリクエスト送信中...');
    
    const requestData: ChatCompletionRequest = {
      model: modelName,
      messages: [
        { role: "user", content: prompt }
      ]
    };

    const response = await axios.post<ChatCompletionResponse>(
      "https://openrouter.ai/api/v1/chat/completions",
      requestData,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log('応答を受信しました');
    
    // 応答が存在することを確認
    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('APIからの応答に内容が含まれていません');
    }
    
    const markdownContent = response.data.choices[0]?.message?.content ?? '';
    
    // レスポンス情報の表示
    if (response.data.model) {
      console.log(`使用モデル: ${response.data.model}`);
    }
    
    // 使用量情報（存在する場合）
    if (response.data.usage) {
      const usage = response.data.usage;
      console.log(`トークン使用量: ${usage.total_tokens} (プロンプト: ${usage.prompt_tokens}, 応答: ${usage.completion_tokens})`);
    }
    
    return markdownContent;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
    } else {
      console.error("Error:", error);
    }
    throw error;
  }
}

// PDFをMarkdownに変換するメイン関数
async function convertPdfToMarkdown(pdfPath: string, outputPath?: string): Promise<string> {
  try {
    // PDFからテキストを抽出
    const { text, pages } = await extractTextFromPdf(pdfPath);
    
    // ファイル名取得（拡張子なし）
    const fileName = path.basename(pdfPath, '.pdf');
    
    // Mistral AIを使ってマークダウンに変換
    const markdown = await convertToMarkdownWithMistralAI(text, fileName);
    
    // メタデータ情報を追加
    const metaData = `---
title: ${fileName}
date: ${new Date().toISOString().split('T')[0]}
source: PDF変換（Mistral AI処理）
pages: ${pages}
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
      `${path.basename(pdfPath, '.pdf')}.md`
    );
    
    // 出力ディレクトリが存在しない場合は作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`PDF -> Markdown 変換を開始します`);
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