# Miro API 連携サービス API 仕様書

## 概要

この API は、Miro ボード上にマインドマップを作成するためのサービスを提供します。

## 認証

すべての API リクエストには、`X-API-Key`ヘッダーに API トークンを設定する必要があります。

```http
X-API-Key: your-api-token
```

## エンドポイント

### 1. トークン検証

API トークンの有効性を確認します。

#### リクエスト

```http
POST /api/tokens/verify
Content-Type: application/json
X-API-Key: your-api-token
```

#### レスポンス

- 成功時 (200 OK)

```json
{
  "valid": true
}
```

- エラー時 (401 Unauthorized)

```json
{
  "error": "Invalid or expired API key"
}
```

### 2. マインドマップ作成

Miro ボード上にマインドマップを作成します。

#### リクエスト

```http
POST /api/mindmap
Content-Type: application/json
X-API-Key: your-api-token
```

#### リクエストボディ

```json
{
  "name": "プロジェクト計画",
  "root_node": {
    "text": "要件定義",
    "children": [
      {
        "text": "機能要件",
        "children": [
          {
            "text": "ユーザー管理"
          },
          {
            "text": "認証機能"
          }
        ]
      },
      {
        "text": "非機能要件",
        "children": [
          {
            "text": "パフォーマンス"
          },
          {
            "text": "セキュリティ"
          }
        ]
      }
    ]
  }
}
```

#### レスポンス

- 成功時 (200 OK)

```json
{
  "board_id": "ボードのID",
  "board_url": "MiroボードのURL"
}
```

- エラー時
  - 400 Bad Request
  ```json
  {
    "error": "Invalid request body: root_node is required"
  }
  ```
  - 401 Unauthorized
  ```json
  {
    "error": "API key is required"
  }
  ```
  - 403 Forbidden
  ```json
  {
    "error": "Invalid or expired API key"
  }
  ```
  - 404 Not Found
  ```json
  {
    "error": "Miroアカウントが見つかりません"
  }
  ```
  - 500 Internal Server Error
  ```json
  {
    "error": "Internal Server Error",
    "details": "エラーの詳細"
  }
  ```

## 使用例

### cURL

```bash
# トークン検証
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-token" \
  https://your-domain.com/api/tokens/verify

# マインドマップ作成
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-token" \
  -d '{
    "name": "プロジェクト計画",
    "root_node": {
      "text": "要件定義",
      "children": [
        {
          "text": "機能要件",
          "children": [
            {"text": "ユーザー管理"},
            {"text": "認証機能"}
          ]
        }
      ]
    }
  }' \
  https://your-domain.com/api/mindmap
```

### JavaScript/TypeScript

```typescript
// トークン検証
const verifyToken = async (token: string) => {
  const response = await fetch("https://your-domain.com/api/tokens/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token,
    },
  });
  return response.json();
};

// マインドマップ作成
const createMindMap = async (
  token: string,
  mindmapData: {
    name: string;
    root_node: {
      text: string;
      children?: Array<{
        text: string;
        children?: Array<{
          text: string;
        }>;
      }>;
    };
  }
) => {
  const response = await fetch("https://your-domain.com/api/mindmap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token,
    },
    body: JSON.stringify(mindmapData),
  });
  return response.json();
};
```

### Postman

1. リクエストの基本設定

   - メソッド: `POST`
   - URL: `https://your-domain.com/api/mindmap`

2. ヘッダーの設定

   ```
   Content-Type: application/json
   X-API-Key: your-api-token
   ```

3. リクエストボディの設定（raw/JSON）
   ```json
   {
     "name": "プロジェクト計画",
     "root_node": {
       "text": "要件定義",
       "children": [
         {
           "text": "機能要件",
           "children": [{ "text": "ユーザー管理" }, { "text": "認証機能" }]
         }
       ]
     }
   }
   ```

## 注意事項

1. API トークンは安全に管理してください
2. すべてのリクエストは HTTPS で行ってください
3. リクエストボディの構造は正確に守ってください
4. エラーハンドリングを適切に行ってください
5. レート制限に注意してください

## サポート

問題が発生した場合は、以下の情報を含めてサポートに連絡してください：

- エラーメッセージ
- リクエストの詳細
- レスポンスの詳細
- 発生時刻
