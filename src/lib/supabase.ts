import { createClient } from "@supabase/supabase-js";
import { MiroToken } from "./miro";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabaseの環境変数が設定されていません");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Miroトークンの保存
export async function saveMiroToken(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  console.log("[Miro Token] トークン保存開始:", {
    userId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    expiresIn,
    timestamp: new Date().toISOString(),
  });
  try {
    // miro_accountsからmiro_account_idを取得
    const { data: miroAccount, error: accountError } = await supabase
      .from("miro_accounts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (accountError || !miroAccount) {
      console.error("[Miro Token] Miroアカウントが見つかりません:", { userId });
      return { error: accountError || "Miroアカウントが見つかりません" };
    }

    // トークン情報を保存
    const { data: tokenData, error: tokenError } = await supabase
      .from("miro_token")
      .upsert({
        miro_account_id: miroAccount.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tokenError) {
      console.error("[Miro Token] トークン保存エラー:", {
        error: tokenError,
        errorCode: tokenError.code,
        errorMessage: tokenError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return { error: tokenError };
    }

    console.log("[Miro Token] トークン保存完了:", {
      userId,
      tokenId: tokenData?.id,
      timestamp: new Date().toISOString(),
    });

    return { data: { success: true } };
  } catch (error) {
    console.error("[Miro Token] 予期せぬエラー:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return { error };
  }
}

// Miroトークンの取得
export const getMiroToken = async (userId: string): Promise<MiroToken> => {
  try {
    // miro_accountsからmiro_account_idを取得
    const { data: miroAccount, error: accountError } = await supabase
      .from("miro_accounts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (accountError || !miroAccount) {
      throw new Error("Miroアカウントが見つかりません");
    }

    const { data, error } = await supabase
      .from("miro_token")
      .select("*")
      .eq("miro_account_id", miroAccount.id)
      .single();

    if (error) {
      console.error("トークン取得エラー:", error);
      throw new Error(`トークン取得エラー: ${error.message}`);
    }

    if (!data) {
      throw new Error("トークンが見つかりません");
    }

    // トークンの有効期限チェック
    const lastUpdated = new Date(data.updated_at);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (lastUpdated < oneHourAgo) {
      throw new Error("トークンの有効期限が切れています");
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: 3600, // 1時間
      token_type: "Bearer",
    };
  } catch (error) {
    console.error("トークン取得中の予期せぬエラー:", error);
    throw error;
  }
};

// Miroトークンの削除
export const deleteMiroToken = async (userId: string) => {
  // miro_account_idを取得
  const { data: miroAccount, error: accountError } = await supabase
    .from("miro_accounts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (accountError || !miroAccount) {
    throw new Error("Miroアカウントが見つかりません");
  }

  const { error } = await supabase
    .from("miro_token")
    .delete()
    .eq("miro_account_id", miroAccount.id);

  if (error) {
    console.error("Error deleting Miro token:", error);
    throw error;
  }
};

export async function saveMiroAccount(
  userId: string,
  miroUserData: { id: string; team_id: string },
  miroWorkspaceData: { id: string; name: string }
) {
  console.log("[Miro Account] アカウント保存開始:", {
    userId,
    miroUserId: miroUserData.id,
    teamId: miroUserData.team_id,
    workspaceId: miroWorkspaceData.id,
    workspaceName: miroWorkspaceData.name,
    timestamp: new Date().toISOString(),
  });
  try {
    // 既存のアカウントを確認
    const { data: existingAccount, error: checkError } = await supabase
      .from("miro_accounts")
      .select("id, user_id, miro_user_id, miro_workspace_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("[Miro Account] 既存アカウント確認エラー:", {
        error: checkError,
        errorCode: checkError.code,
        errorMessage: checkError.message,
        userId,
        timestamp: new Date().toISOString(),
      });
      return { error: checkError };
    }

    console.log("[Miro Account] 既存アカウント確認結果:", {
      exists: !!existingAccount,
      accountId: existingAccount?.id,
      userId: existingAccount?.user_id,
      miroUserId: existingAccount?.miro_user_id,
      workspaceId: existingAccount?.miro_workspace_id,
      timestamp: new Date().toISOString(),
    });

    let miroAccount;
    if (existingAccount) {
      // 既存アカウントの更新
      console.log("[Miro Account] 既存アカウント更新開始:", {
        accountId: existingAccount.id,
        timestamp: new Date().toISOString(),
      });

      const { data: updatedAccount, error: updateError } = await supabase
        .from("miro_accounts")
        .update({
          user_id: userId,
          miro_user_id: miroUserData.id,
          miro_workspace_id: miroWorkspaceData.id,
          miro_workspace_name: miroWorkspaceData.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAccount.id)
        .select()
        .single();

      if (updateError) {
        console.error("[Miro Account] アカウント更新エラー:", {
          error: updateError,
          errorCode: updateError.code,
          errorMessage: updateError.message,
          accountId: existingAccount.id,
          userId,
          timestamp: new Date().toISOString(),
        });
        return { error: updateError };
      }

      miroAccount = updatedAccount;
      console.log("[Miro Account] 既存アカウント更新完了:", {
        accountId: updatedAccount.id,
        updatedAccount,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 新規アカウントの作成
      console.log(
        "[Miro Account] RLSデバッグ: INSERTしようとしているuser_id, 認証ユーザーID(auth.uid()):",
        {
          insertUserId: userId,
          authUid: userId, // サーバー側でauth.uid()が直接取れないため、ここでは引数userIdをauth.uid()相当として出力
        }
      );

      const { data: newAccount, error: insertError } = await supabase
        .from("miro_accounts")
        .insert({
          user_id: userId,
          miro_user_id: miroUserData.id,
          miro_workspace_id: miroWorkspaceData.id,
          miro_workspace_name: miroWorkspaceData.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Miro Account] アカウント作成エラー:", {
          error: insertError,
          errorCode: insertError.code,
          errorMessage: insertError.message,
          userId,
          timestamp: new Date().toISOString(),
        });
        return { error: insertError };
      }

      miroAccount = newAccount;
      console.log("[Miro Account] 新規アカウント作成完了:", {
        accountId: newAccount.id,
        newAccount,
        timestamp: new Date().toISOString(),
      });
    }

    return { data: miroAccount };
  } catch (error) {
    console.error("[Miro Account] 予期せぬエラー:", {
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return { error };
  }
}
