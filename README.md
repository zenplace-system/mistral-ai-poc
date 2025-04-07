目次
@[toc]

# OpenRouter経由でMistralAIを利用する方法

このドキュメントは、開発チームがOpenRouterプラットフォームを通じてMistralAIモデルを利用するためのガイドです。

## 概要

OpenRouterは、様々なLLM（大規模言語モデル）プロバイダーのAPIを統一されたインターフェースで利用できるサービスです。これにより、MistralAIを含む複数のモデルを簡単に切り替えて試すことができます。

すでに会社としてOpenRouterアカウントを開設し、APIクレジットを$200分購入済みです。

*   **アカウント情報:** [社内Wiki: /システム部/事始め/アカウント情報](https://wiki.zen-jp.info:8443/5ee7f8f76f6a1900463d2fe2)
*   **契約情報:** [社内Wiki: /システム部/チーム/エンジニア/AI/OpenRouter/契約情報](https://wiki.zen-jp.info:8443/67f333ab39ea790052f27a32)

## 必要なもの

1.  **OpenRouter APIキー:**
    *   OpenRouterアカウントにログインし、[Keysページ](https://openrouter.ai/keys)からAPIキーを生成・取得してください。
    *   **注意:** APIキーは機密情報です。安全に管理し、コード内に直接ハードコードせず、環境変数や設定ファイルなどを利用して管理してください。上記アカウント情報ページにもキーの情報が記載されている可能性があります（担当者に確認してください）。
2.  **利用したいMistralAIモデル名:**
    *   OpenRouterでは、複数のMistralAIモデルが利用可能です。代表的なモデル名は以下の通りです（最新情報は[OpenRouter Modelsページ](https://openrouter.ai/models)で確認してください）。
        *   `mistralai/mistral-7b-instruct`: 高速で汎用的な指示応答モデル
        *   `mistralai/mixtral-8x7b-instruct`: 高性能なMoE（Mixture of Experts）モデル
        *   `mistralai/mistral-large`: Mistral AI の最新のフラッグシップモデル (利用可能か確認)
    *   利用したいモデル名をAPIリクエスト時に指定します。

## API利用方法

OpenRouterのAPIはOpenAIのAPIと互換性があります。

*   **APIエンドポイント:** `https://openrouter.ai/api/v1/chat/completions`
*   **認証:** HTTPヘッダーに `Authorization: Bearer YOUR_OPENROUTER_API_KEY` を含めます。
*   **リクエストボディ:** OpenAI互換の形式で、`model` フィールドに使用したいモデル名（例: `mistralai/mistral-7b-instruct`）を指定します。

### 例1: cURLでのリクエスト

```bash
curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_OPENROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "mistralai/mistral-7b-instruct", # 使用するモデル名
    "messages": [
      {"role": "user", "content": "日本の首都は？"}
    ]
  }'
```
*   `YOUR_OPENROUTER_API_KEY` は実際のAPIキーに置き換えてください。

### 例2: TypeScript (fetch API)

```typescript
// TypeScriptでOpenRouterのAPIを利用する例
async function callMistralAI(prompt: string): Promise<string> {
  // 環境変数からAPIキーを取得することを推奨
  const apiKey = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_API_KEY";
  const modelName = "mistralai/mistral-7b-instruct"; // または他のMistralAIモデル名

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// 使用例
async function main() {
  try {
    const answer = await callMistralAI("JavaScriptとTypeScriptの主な違いは何ですか？");
    console.log(answer);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```
*   `YOUR_OPENROUTER_API_KEY` は実際のAPIキーに置き換えるか、環境変数 `OPENROUTER_API_KEY` を設定してください。

### 例3: TypeScript (axios)

```typescript
// axios ライブラリを使ったTypeScriptの例
import axios from 'axios';

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
  }[];
}

async function getMistralResponse(prompt: string): Promise<string> {
  // 環境変数からAPIキーを取得することを推奨
  const apiKey = process.env.OPENROUTER_API_KEY || "YOUR_OPENROUTER_API_KEY";
  const modelName = "mistralai/mistral-7b-instruct"; // または他のMistralAIモデル名

  try {
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

    return response.data.choices[0].message.content;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
    } else {
      console.error("Error:", error);
    }
    throw error;
  }
}

// 使用例
async function executeExample() {
  try {
    const result = await getMistralResponse("TypeScriptの非同期プログラミングについて説明してください");
    console.log(result);
  } catch (error) {
    console.error("実行エラー:", error);
  }
}

executeExample();
```
*   `axios` ライブラリ ( `npm install axios` または `yarn add axios` ) が必要です。
*   `YOUR_OPENROUTER_API_KEY` は実際のAPIキーに置き換えるか、環境変数 `OPENROUTER_API_KEY` を設定してください。

## 注意点

*   **コスト管理:** OpenRouterは利用量に応じてクレジットを消費します。利用状況はOpenRouterのダッシュボードで確認できます。無駄なAPIコールを避けるように実装してください。
*   **レートリミット:** モデルやアカウントの状況に応じてレートリミットが存在する場合があります。APIリファレンスやエラーメッセージを確認してください。
*   **エラーハンドリング:** APIリクエストが失敗する場合（認証エラー、無効なモデル名、レートリミット超過など）に備え、適切なエラーハンドリングを実装してください。

## 参考情報

*   [OpenRouter 公式サイト](https://openrouter.ai/)
*   [OpenRouter モデル一覧](https://openrouter.ai/models)
*   [OpenRouter APIドキュメント](https://openrouter.ai/docs) (主にOpenAI互換APIについての説明)
