"use client";

import { useState } from "react";
import { MindMapNode } from "@/types/miro";

interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: string;
  description: string;
  requiredHeaders: string[];
  requiredBody?: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
  sampleBody?: {
    name: string;
    root_node: MindMapNode;
  };
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "verify-token",
    name: "トークン検証",
    path: "/api/tokens/verify",
    method: "POST",
    description: "APIトークンの有効性を検証します",
    requiredHeaders: ["X-API-Key"],
  },
  {
    id: "create-mindmap",
    name: "マインドマップ作成",
    path: "/api/mindmap",
    method: "POST",
    description: "新しいマインドマップを作成します",
    requiredHeaders: ["X-API-Key"],
    requiredBody: {
      name: {
        type: "string",
        description: "ボード名",
        required: true,
      },
      root_node: {
        type: "object",
        description: "ルートノード",
        required: true,
      },
    },
    sampleBody: {
      name: "マインドマップサンプル",
      root_node: {
        text: "プロジェクト計画",
        children: [
          {
            text: "要件定義",
            children: [
              {
                text: "機能要件",
                children: [
                  {
                    text: "ユーザー管理",
                    id: "",
                  },
                  {
                    text: "データ分析",
                    id: "",
                  },
                ],
                id: "",
              },
              {
                text: "非機能要件",
                children: [
                  {
                    text: "セキュリティ",
                    id: "",
                  },
                  {
                    text: "パフォーマンス",
                    id: "",
                  },
                ],
                id: "",
              },
            ],
            id: "",
          },
          {
            text: "設計",
            children: [
              {
                text: "システム設計",
                children: [
                  {
                    text: "アーキテクチャ",
                    id: "",
                  },
                  {
                    text: "データベース設計",
                    id: "",
                  },
                ],
                id: "",
              },
              {
                text: "UI/UX設計",
                children: [
                  {
                    text: "ワイヤーフレーム",
                    id: "",
                  },
                  {
                    text: "プロトタイプ",
                    id: "",
                  },
                ],
                id: "",
              },
            ],
            id: "",
          },
        ],
        id: "",
      },
    },
  },
];

export default function ApiTestPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    API_ENDPOINTS[0].id
  );
  const [apiKey, setApiKey] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentEndpoint = API_ENDPOINTS.find(
    (ep) => ep.id === selectedEndpoint
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 必要なヘッダーを追加
      if (currentEndpoint?.requiredHeaders.includes("X-API-Key")) {
        headers["X-API-Key"] = apiKey;
      }

      const response = await fetch(currentEndpoint?.path || "", {
        method: currentEndpoint?.method || "POST",
        headers,
        body: requestBody ? requestBody : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">APIテスト</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">エンドポイント</label>
        <select
          value={selectedEndpoint}
          onChange={(e) => setSelectedEndpoint(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {API_ENDPOINTS.map((endpoint) => (
            <option key={endpoint.id} value={endpoint.id}>
              {endpoint.name} ({endpoint.method} {endpoint.path})
            </option>
          ))}
        </select>
      </div>

      {currentEndpoint && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h2 className="font-bold mb-2">{currentEndpoint.name}</h2>
          <p className="text-sm text-gray-600 mb-2">
            {currentEndpoint.description}
          </p>
          <p className="text-sm text-gray-600">
            <strong>メソッド:</strong> {currentEndpoint.method}
          </p>
          <p className="text-sm text-gray-600">
            <strong>パス:</strong> {currentEndpoint.path}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {currentEndpoint?.requiredHeaders.includes("X-API-Key") && (
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}

        {currentEndpoint?.requiredBody && (
          <div>
            <label className="block text-sm font-medium mb-1">
              リクエストボディ (JSON)
            </label>
            <div className="mb-2 text-sm text-gray-600">
              <p>必要なフィールド:</p>
              <ul className="list-disc list-inside">
                {Object.entries(currentEndpoint.requiredBody).map(
                  ([key, field]) => (
                    <li key={key}>
                      {key} ({field.type}) - {field.description}
                      {field.required && " (必須)"}
                    </li>
                  )
                )}
              </ul>
            </div>
            {currentEndpoint.sampleBody && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">サンプルJSON:</p>
                <pre className="p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                  {JSON.stringify(currentEndpoint.sampleBody, null, 2)}
                </pre>
              </div>
            )}
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full p-2 border rounded font-mono"
              rows={10}
              placeholder="{}"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? "処理中..." : "APIをテスト"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          <h2 className="font-bold">エラー</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h2 className="font-bold">レスポンス</h2>
          <pre className="mt-2 p-2 bg-white rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
