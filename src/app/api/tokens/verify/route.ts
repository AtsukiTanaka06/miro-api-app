import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // APIトークンの取得
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json(
        {
          valid: false,
          error: "API key is required",
        },
        { status: 401 }
      );
    }

    // トークンの検証と有効期限チェック
    const { data: tokenData, error: tokenError } = await supabase
      .from("api_tokens")
      .select("*")
      .eq("token", apiKey)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid or expired API key",
        },
        { status: 403 }
      );
    }

    // トークンの使用履歴を記録
    await supabase.from("api_token_logs").insert([
      {
        token_id: tokenData.id,
        action: "verify",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    ]);

    // 有効なトークンの場合
    return NextResponse.json({
      valid: true,
      token: {
        id: tokenData.id,
        name: tokenData.name,
        created_at: tokenData.created_at,
        expires_at: tokenData.expires_at,
      },
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
