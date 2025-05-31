-- miro_tokenテーブルのRLSを有効化
ALTER TABLE miro_token ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分のトークンのみを参照できるポリシー
CREATE POLICY "Users can view their own miro tokens"
ON miro_token
FOR SELECT
USING (auth.uid() = user_id);

-- ユーザーが自分のトークンのみを挿入できるポリシー
CREATE POLICY "Users can insert their own miro tokens"
ON miro_token
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分のトークンのみを更新できるポリシー
CREATE POLICY "Users can update their own miro tokens"
ON miro_token
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分のトークンのみを削除できるポリシー
CREATE POLICY "Users can delete their own miro tokens"
ON miro_token
FOR DELETE
USING (auth.uid() = user_id); 