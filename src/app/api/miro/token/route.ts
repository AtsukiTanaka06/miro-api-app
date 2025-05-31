// app/api/miro/token/route.ts
import { NextRequest, NextResponse } from "next/server";

// Node.js Runtime を明示（Edge RuntimeではBufferが使えない）
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("[Miro Token] リクエスト開始:", {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
  });

  try {
    const { code, userId } = await request.json();
    console.log("[Miro Token] リクエストデータ:", {
      hasCode: !!code,
      hasUserId: !!userId,
      userId,
      codeLength: code?.length,
      timestamp: new Date().toISOString(),
    });

    if (!code || !userId) {
      console.error("[Miro Token] パラメータ不足:", {
        hasCode: !!code,
        hasUserId: !!userId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "認証コードとユーザーIDが必要です" },
        { status: 400 }
      );
    }

    // 環境変数の確認
    console.log("[Miro Token] 環境変数確認:", {
      hasClientId: !!process.env.NEXT_PUBLIC_MIRO_CLIENT_ID,
      hasClientSecret: !!process.env.MIRO_CLIENT_SECRET,
      hasRedirectUri: !!process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI,
      clientId: process.env.NEXT_PUBLIC_MIRO_CLIENT_ID,
      redirectUri: process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI,
      timestamp: new Date().toISOString(),
    });

    // Miroトークンの取得
    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.NEXT_PUBLIC_MIRO_CLIENT_ID!,
      client_secret: process.env.MIRO_CLIENT_SECRET!,
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI!,
    });

    console.log("[Miro Token] トークンリクエスト開始:", {
      url: "https://api.miro.com/v1/oauth/token",
      grantType: "authorization_code",
      hasClientId: !!process.env.NEXT_PUBLIC_MIRO_CLIENT_ID,
      hasClientSecret: !!process.env.MIRO_CLIENT_SECRET,
      hasRedirectUri: !!process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI,
      timestamp: new Date().toISOString(),
    });

    const tokenResponse = await fetch("https://api.miro.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenRequestBody,
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error("[Miro Token] トークン取得エラー:", {
        error,
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Miroトークンの取得に失敗しました", details: error },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("[Miro Token] トークン取得成功:", {
      userId,
      miroUserId: tokenData.user_id,
      accessToken: tokenData.access_token
        ? `${tokenData.access_token.substring(0, 10)}...`
        : null,
      refreshToken: tokenData.refresh_token
        ? `${tokenData.refresh_token.substring(0, 10)}...`
        : null,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(tokenData);
  } catch (error) {
    console.error("[Miro Token] 予期せぬエラー:", {
      error,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
