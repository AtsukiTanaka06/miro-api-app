-- miro_tokensテーブルの更新
ALTER TABLE miro_tokens
  ADD COLUMN miro_account_id UUID REFERENCES miro_accounts(id) ON DELETE CASCADE;

-- 既存のレコードのmiro_account_idを更新
UPDATE miro_tokens mt
SET miro_account_id = ma.id
FROM miro_accounts ma
WHERE mt.user_id = ma.user_id;

-- miro_account_idをNOT NULLに設定
ALTER TABLE miro_tokens
  ALTER COLUMN miro_account_id SET NOT NULL;

-- インデックスを作成
CREATE INDEX miro_tokens_miro_account_id_idx ON miro_tokens(miro_account_id);

-- RLSポリシーを更新
DROP POLICY IF EXISTS "Users can view their own tokens" ON miro_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON miro_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON miro_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON miro_tokens;

CREATE POLICY "Users can view their own tokens"
  ON miro_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON miro_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON miro_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON miro_tokens FOR DELETE
  USING (auth.uid() = user_id); 