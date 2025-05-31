import { supabase } from "./supabase";
import { createClient } from "@supabase/supabase-js";
import { MiroBoard, MiroShape, MiroConnector } from "@/types/miro";

const MIRO_API_BASE = "https://api.miro.com/v2";

export interface MiroToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export const getMiroAuthUrl = () => {
  const clientId = process.env.NEXT_PUBLIC_MIRO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI;
  const scope = "boards:read+boards:write";

  console.log("Miro environment variables:", {
    clientId,
    redirectUri,
    scope,
  });

  if (!clientId || !redirectUri) {
    console.error("Miro environment variables are not set:", {
      clientId: !!clientId,
      redirectUri: !!redirectUri,
    });
    throw new Error("Miro configuration is missing");
  }

  const authUrl = `https://miro.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&access_type=offline&prompt=consent`;
  console.log("Generated Miro auth URL:", authUrl);
  return authUrl;
};

export const createMiroBoard = async (title: string, accessToken: string) => {
  const response = await fetch(`${MIRO_API_BASE}/boards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: title,
      policy: {
        permissionsPolicy: {
          collaborationToolsStartAccess: "all_editors",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create Miro board");
  }

  return response.json();
};

export const createMiroShape = async (
  boardId: string,
  accessToken: string,
  shapeData: {
    shape:
      | "rectangle"
      | "ellipse"
      | "triangle"
      | "parallelogram"
      | "rhombus"
      | "pentagon"
      | "hexagon"
      | "octagon"
      | "trapezoid"
      | "star"
      | "arrow";
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style?: Record<string, any>;
  }
) => {
  const response = await fetch(`${MIRO_API_BASE}/boards/${boardId}/shapes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(shapeData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Miro API] createShape error:", errorText);
    throw new Error("Failed to create Miro shape");
  }

  return response.json();
};

export const sampleShapeData = {
  shape: "rectangle",
  text: "ノードのテキスト",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  style: {
    fillColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 2,
    borderStyle: "normal",
    textAlign: "center",
    textAlignVertical: "middle",
  },
};

export const saveMiroToken = async (userId: string, token: MiroToken) => {
  try {
    // まずmiro_accountsからmiro_account_idを取得
    const { data: miroAccount, error: accountError } = await supabase
      .from("miro_accounts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (accountError) {
      if (accountError.code === "PGRST116") {
        // アカウントが存在しない場合は新規作成
        const { data: newAccount, error: createError } = await supabase
          .from("miro_accounts")
          .insert({
            user_id: userId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          throw new Error("Miroアカウントの作成に失敗しました");
        }

        // 新規作成したアカウントのIDを使用
        const { error: tokenError } = await supabase.from("miro_token").upsert({
          miro_account_id: newAccount.id,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          updated_at: new Date().toISOString(),
        });

        if (tokenError) {
          throw new Error("トークンの保存に失敗しました");
        }
      } else {
        throw new Error("Miroアカウントの取得に失敗しました");
      }
    } else {
      // 既存のアカウントにトークンを保存
      const { error: tokenError } = await supabase.from("miro_token").upsert({
        miro_account_id: miroAccount.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        updated_at: new Date().toISOString(),
      });

      if (tokenError) {
        throw new Error("トークンの保存に失敗しました");
      }
    }
  } catch (error) {
    console.error("Miroトークン保存エラー:", error);
    throw error;
  }
};

export const getMiroToken = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("miro_token")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Miroトークンが見つかりません");
      }
      throw new Error("トークンの取得に失敗しました");
    }

    return data;
  } catch (error) {
    console.error("Miroトークン取得エラー:", error);
    throw error;
  }
};

export class MiroClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.baseUrl = MIRO_API_BASE;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };
    console.log("[Miro APIリクエスト]", {
      url,
      method: requestOptions.method,
      headers: requestOptions.headers,
      body: requestOptions.body,
    });
    const response = await fetch(url, requestOptions);
    const responseText = await response.text();
    console.log("[Miro APIレスポンス]", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });
    if (!response.ok) {
      throw new Error(`Miro API error: ${response.statusText}`);
    }
    return JSON.parse(responseText);
  }

  async createBoard(name: string): Promise<MiroBoard> {
    return this.request<MiroBoard>("/boards", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async createShape(
    boardId: string,
    data: { data: Omit<MiroShape, "id"> }
  ): Promise<MiroShape> {
    return this.request<MiroShape>(`/boards/${boardId}/shapes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createConnector(
    boardId: string,
    data: Omit<MiroConnector, "id">
  ): Promise<MiroConnector> {
    return this.request<MiroConnector>(`/boards/${boardId}/connectors`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createMindMapNode(
    boardId: string,
    data: {
      data: {
        nodeView: {
          data: {
            type: "text";
            content: string;
          };
        };
      };
      parent?: {
        id: string;
      };
    }
  ): Promise<MiroShape> {
    return this.request<MiroShape>(
      `-experimental/boards/${boardId}/mindmap_nodes`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async updateMindMapNode(
    boardId: string,
    nodeId: string,
    data: {
      data: {
        parent: {
          id: string;
        };
      };
    }
  ): Promise<MiroShape> {
    return this.request<MiroShape>(
      `-experimental/boards/${boardId}/mindmap_nodes/${nodeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }
}

interface InputNode {
  text: string;
  children?: InputNode[];
}

interface InputData {
  name: string;
  root_node: InputNode;
}
