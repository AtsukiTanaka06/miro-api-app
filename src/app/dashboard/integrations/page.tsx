"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMiroAuthUrl, getMiroToken } from "@/lib/miro";
import { useRouter } from "next/navigation";

interface ApiToken {
  id: string;
  token: string;
  name: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface MiroAccount {
  id: string;
  user_id: string;
  miro_user_id: string;
  miro_email: string;
  miro_workspace_id: string;
  miro_workspace_name: string;
  access_token: string;
  refresh_token: string;
  created_at: string;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [miroAccounts, setMiroAccounts] = useState<MiroAccount[]>([]);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // セッションの初期化を待機
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("セッションエラー:", sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log("セッションが見つかりません");
          setError("セッションが見つかりません。再度ログインしてください。");
          return;
        }

        // ユーザー情報の取得
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("ユーザー取得エラー:", userError);
          throw userError;
        }

        if (!user) {
          console.log("ユーザーが見つかりません");
          setError("ユーザーが見つかりません。再度ログインしてください。");
          return;
        }

        // ユーザーが認証されている場合、データを取得
        await Promise.all([fetchMiroAccounts(), fetchTokens()]);

        setIsInitialized(true);
      } catch (err) {
        console.error("認証初期化エラー:", err);
        setError("認証に失敗しました。再度ログインしてください。");
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("認証状態の変更:", event, session?.user?.id);

      if (event === "SIGNED_IN" && session?.user) {
        await initializeAuth();
      } else if (event === "SIGNED_OUT") {
        setError("セッションが切れました。再度ログインしてください。");
        setIsInitialized(false);
        router.push("/signin");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Miroアカウントの一覧を取得
  const fetchMiroAccounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("miro_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setMiroAccounts(data || []);
    } catch (err) {
      console.error("Error fetching Miro accounts:", err);
      setError("Miroアカウントの取得に失敗しました");
    }
  };

  const handleMiroConnect = async () => {
    setIsConnecting(true);
    window.location.href = getMiroAuthUrl();
  };

  // Miroアカウントを削除
  const handleDeleteMiroAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from("miro_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
      setSuccess("Miroアカウントの連携を解除しました");
      fetchMiroAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // APIトークンの一覧を取得
  const fetchTokens = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("api_tokens")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError("APIトークンの取得に失敗しました");
    }
  };

  // 新しいAPIトークンを生成
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInitialized) {
      setError("認証が初期化されていません。ページを再読み込みしてください。");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // セッション情報を取得
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error("セッションの取得に失敗しました。");
      }

      if (!session) {
        throw new Error(
          "認証セッションが見つかりません。再度ログインしてください。"
        );
      }

      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newTokenName }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "トークンの生成に失敗しました");
      }

      const data = await response.json();
      setSuccess("新しいAPIトークンが生成されました");
      setNewTokenName("");
      fetchTokens();
    } catch (err) {
      console.error("トークン生成エラー:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // APIトークンを削除
  const handleDeleteToken = async (token: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "認証セッションが見つかりません。再度ログインしてください。"
        );
      }

      const response = await fetch("/api/tokens", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "トークンの削除に失敗しました");
      }

      setSuccess("APIトークンを削除しました");
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // ログアウト後、サインインページにリダイレクト
      router.push("/signin");
    } catch (err) {
      console.error("ログアウトエラー:", err);
      setError("ログアウトに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Miro連携セクション */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Miro連携
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Miroと連携して、マインドマップの作成と管理を行います。</p>
            <p className="mt-1">
              複数のMiroアカウントを連携することができます。
            </p>
          </div>
          <div className="mt-5">
            <button
              onClick={handleMiroConnect}
              disabled={isConnecting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {isConnecting ? "接続中..." : "Miroアカウントを追加"}
            </button>
          </div>

          {/* 連携済みのMiroアカウント一覧 */}
          {miroAccounts.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900">
                連携済みのMiroアカウント
              </h4>
              <div className="mt-2 divide-y divide-gray-200">
                {miroAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {account.miro_email}
                      </p>
                      <p className="text-sm text-gray-500">
                        ワークスペース: {account.miro_workspace_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        連携日:{" "}
                        {new Date(account.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        ステータス:{" "}
                        <span className="text-green-600">連携済み</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleDeleteMiroAccount(account.id)}
                        className="text-sm text-red-600 hover:text-red-900"
                      >
                        連携解除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {miroAccounts.length === 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                連携済みのMiroアカウントはありません。「Miroアカウントを追加」ボタンをクリックして連携を開始してください。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connect Service APIトークン管理セクション */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Connect Service APIトークン管理
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Connect
              ServiceのAPIトークンを生成して、外部アプリケーションからAPIにアクセスできます。
            </p>
            <p className="mt-1">
              トークン名は、このトークンの用途を識別するための任意の名前です。
              例：「開発環境用」「本番環境用」「テスト用」など
            </p>
          </div>

          <form
            onSubmit={handleCreateToken}
            className="mt-5 sm:flex sm:items-center"
          >
            <div className="w-full sm:max-w-xs">
              <label htmlFor="token-name" className="sr-only">
                トークン名
              </label>
              <input
                type="text"
                name="token-name"
                id="token-name"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="例：開発環境用"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-indigo-300"
            >
              {loading ? "生成中..." : "トークンを生成"}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">成功</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 既存のAPIトークン一覧 */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            既存のAPIトークン
          </h3>
          <div className="mt-5">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                          名前
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          トークン
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          作成日
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          有効期限
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          ステータス
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">操作</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {tokens.map((token) => (
                        <tr key={token.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {token.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {token.token}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(token.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(token.expires_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {token.is_active ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                有効
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                無効
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            {token.is_active && (
                              <button
                                onClick={() => handleDeleteToken(token.token)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                無効化
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
