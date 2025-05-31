"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MiroCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. セッションの確認と復元
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[Miro Callback] セッションエラー:", sessionError);
          throw new Error("セッションの取得に失敗しました");
        }

        if (!session) {
          console.log("[Miro Callback] セッションなし、リフレッシュを試行");
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError || !refreshedSession) {
            console.error(
              "[Miro Callback] セッションリフレッシュエラー:",
              refreshError
            );
            throw new Error("セッションの復元に失敗しました");
          }
        }

        const userId = session?.user?.id;
        if (!userId) {
          throw new Error("ユーザーIDが取得できません");
        }

        // 2. Miroからの認証コード受信
        const code = searchParams.get("code");
        if (!code) {
          throw new Error("認証コードが提供されていません");
        }

        // 3. サーバーAPIでトークンを取得
        console.log("[Miro Callback] トークン取得リクエスト開始");
        const response = await fetch("/api/miro/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            userId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("[Miro Callback] トークン取得エラー:", error);
          throw new Error(error.error || "Miroトークンの取得に失敗しました");
        }

        const tokenData = await response.json();
        console.log("[Miro Callback] トークン取得成功:", {
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

        // 4. トークン情報の保存
        const tokenRecord = {
          user_id: userId,
          miro_user_id: tokenData.user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          created_at: new Date().toISOString(),
          expires_in: tokenData.expires_in,
        };

        console.log("[Miro Callback] トークン保存開始（API経由）:", {
          userId,
          miroUserId: tokenData.user_id,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          timestamp: new Date().toISOString(),
        });

        // サーバーサイドAPI経由で保存
        const saveRes = await fetch("/api/miro/save-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenRecord),
        });
        if (!saveRes.ok) {
          const error = await saveRes.json();
          console.error("[Miro Callback] トークン保存エラー(API):", error);
          throw new Error("トークン情報の保存に失敗しました(API)");
        }

        console.log("[Miro Callback] トークン保存成功(API):", {
          userId,
          miroUserId: tokenData.user_id,
          timestamp: new Date().toISOString(),
        });

        console.log("[Miro Callback] 連携成功");
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard/integrations");
        }, 2000);
      } catch (error) {
        console.error("Miro連携エラー:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "不明なエラーが発生しました"
        );
        setStatus("error");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        {status === "loading" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Miroとの連携を処理中...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
        {status === "success" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-600">
              連携完了！
            </h2>
            <p className="text-gray-600">Miroとの連携が正常に完了しました。</p>
          </div>
        )}
        {status === "error" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push("/dashboard/integrations")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
