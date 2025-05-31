import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

function getSupabaseClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    console.log("supabase", supabase);

    // リクエストヘッダーから認証トークンを取得
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split(" ")[1];

    // トークンを使用してユーザー情報を取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError) {
      console.error("User error:", userError);
      return NextResponse.json(
        { error: "ユーザー情報の取得に失敗しました" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found");
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 401 }
      );
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: "トークン名は必須です" },
        { status: 400 }
      );
    }

    const apiToken = `ct_${randomBytes(32).toString("hex")}`;
    const { data, error } = await supabase
      .from("api_tokens")
      .insert([
        {
          user_id: user.id,
          token: apiToken,
          name,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "トークンの保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Error in POST /api/tokens:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 有効期限切れのトークンを自動的に無効化
    await supabase
      .from("api_tokens")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .lt("expires_at", new Date().toISOString());

    // 有効なトークンのみを取得
    const { data, error } = await supabase
      .from("api_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tokens: data });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    // トークンの使用履歴を記録
    await supabase.from("api_token_logs").insert([
      {
        token_id: token,
        user_id: user.id,
        action: "revoke",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      },
    ]);

    // トークンを無効化
    const { error } = await supabase
      .from("api_tokens")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("token", token)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Token revoked successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function awaitcookies() {
  throw new Error("Function not implemented.");
}
