"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMiroToken, createMiroBoard } from "@/lib/miro";

export default function MindmapPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await getMiroToken(user.id);
          setIsConnected(true);
        } catch (error) {
          setIsConnected(false);
        }
      }
    };
    checkConnection();
  }, []);

  const handleCreateMindmap = async () => {
    if (!title.trim() || !isConnected) return;

    setIsCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const miroToken = await getMiroToken(user.id);
      const board = await createMiroBoard(title, miroToken.access_token);

      // 作成したボードのURLにリダイレクト
      window.open(board.viewLink, "_blank");
      router.push("/dashboard");
    } catch (error) {
      console.error("マインドマップ作成エラー:", error);
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">マインドマップ作成</h1>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Miroとの連携が必要です。</p>
          <button
            onClick={() => router.push("/dashboard/integrations")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            サービス連携へ移動
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">マインドマップ作成</h1>
      <div className="max-w-2xl">
        <div className="mb-6">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            タイトル
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="マインドマップのタイトルを入力"
          />
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreateMindmap}
            disabled={!title.trim() || isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? "作成中..." : "作成する"}
          </button>
        </div>
      </div>
    </div>
  );
}
