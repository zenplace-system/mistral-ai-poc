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

interface ChatCompletionChoice {
  message: {
    content: string;
  };
  index: number;
}

interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
  model?: string;
  usage?: ChatCompletionUsage;
}

async function getMistralResponse(prompt: string): Promise<string> {
  // 環境変数からAPIキーを取得
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEYが設定されていません。.envファイルを確認してください。');
  }
  
  const modelName = "mistralai/mistral-7b-instruct"; // Mistral AIモデル名

  try {
    console.log(`プロンプト: "${prompt}"`);
    console.log('APIリクエスト送信中...');
    
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
    console.log('--------------------');
    
    // 応答が存在することを確認
    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('APIからの応答に内容が含まれていません');
    }
    
    const responseContent = response.data.choices[0]?.message?.content ?? '応答なし';
    
    // レスポンス情報の表示
    console.log(`モデル: ${response.data.model || "不明なモデル"}`);
    
    // 使用量情報（存在する場合）
    if (response.data.usage) {
      const usage = response.data.usage;
      console.log(`トークン使用量: ${usage.total_tokens} (プロンプト: ${usage.prompt_tokens}, 応答: ${usage.completion_tokens})`);
    }
    
    console.log('--------------------');
    
    return responseContent;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
    } else {
      console.error("Error:", error);
    }
    throw error;
  }
}

// メイン実行関数
async function main() {
  try {
    // コマンドライン引数からプロンプトを取得 (デフォルトのプロンプトを設定)
    const defaultPrompt = "日本の気候について簡潔に説明してください。";
    const prompt = process.argv[2] || defaultPrompt;
    
    const result = await getMistralResponse(prompt);
    console.log('Mistral AIの応答:');
    console.log(result);
  } catch (error) {
    console.error("実行エラー:", error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にmain関数を実行
main(); 