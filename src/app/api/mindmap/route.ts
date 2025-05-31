import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MiroClient } from "@/lib/miro";
import { MindMapNode, MindMapCreate, MiroShape } from "@/types/miro";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createMindMap(
  miroClient: MiroClient,
  boardId: string,
  node: MindMapNode
): Promise<MiroShape> {
  // 入力値のバリデーション
  if (!node) {
    throw new Error("Node is required");
  }
  if (!node.text) {
    throw new Error("Node text is required");
  }

  // ルートノードの作成
  const rootNode = await miroClient.createMindMapNode(boardId, {
    data: {
      nodeView: {
        data: {
          type: "text",
          content: node.text,
        },
      },
    },
  });

  // 子ノードの作成（再帰的に）
  const createChildNodes = async (parentId: string, nodes: MindMapNode[]) => {
    for (const childNode of nodes) {
      const child = await miroClient.createMindMapNode(boardId, {
        data: {
          nodeView: {
            data: {
              type: "text",
              content: childNode.text,
            },
          },
        },
        parent: {
          id: parentId,
        },
      });

      if (childNode.children && childNode.children.length > 0) {
        await createChildNodes(child.id, childNode.children);
      }
    }
  };

  // 子ノードの作成を開始
  if (node.children && node.children.length > 0) {
    await createChildNodes(rootNode.id, node.children);
  }

  return rootNode;
}

export async function POST(request: Request) {
  try {
    // APIトークンの検証
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 401 }
      );
    }

    // トークンの検証と有効期限チェック
    const { data: tokenData, error: tokenError } = await supabase
      .from("api_tokens")
      .select("*, user_id")
      .eq("token", apiKey)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 403 }
      );
    }

    // トークンの使用履歴を記録
    await supabase.from("api_token_logs").insert([
      {
        token_id: tokenData.id,
        user_id: tokenData.user_id,
        action: "api_call",
        endpoint: "/api/mindmap",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    ]);

    // Miroアカウントの取得
    const { data: miroAccount, error: miroAccountError } = await supabase
      .from("miro_token")
      .select("*")
      .eq("user_id", tokenData.user_id)
      .single();

    if (miroAccountError || !miroAccount) {
      return NextResponse.json(
        { error: "Miroアカウントが見つかりません" },
        { status: 404 }
      );
    }

    // リクエストボディの取得とバリデーション
    const mindmap: MindMapCreate = await request.json();
    if (!mindmap || !mindmap.root_node) {
      return NextResponse.json(
        { error: "Invalid request body: root_node is required" },
        { status: 400 }
      );
    }

    // Miroクライアントの初期化
    const miroClient = new MiroClient(miroAccount.access_token);

    try {
      // ボードの作成
      const board = await miroClient.createBoard(mindmap.name);

      // マインドマップの作成
      await createMindMap(miroClient, board.id, mindmap.root_node);

      return NextResponse.json({
        board_id: board.id,
        board_url: board.viewLink,
      });
    } catch (error) {
      console.error("Error creating mindmap:", error);
      return NextResponse.json(
        {
          error: "Failed to create mindmap",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating mindmap:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
