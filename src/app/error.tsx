"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          エラーが発生しました
        </h2>
        <p className="text-gray-600 mb-6">
          申し訳ありません。予期せぬエラーが発生しました。
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
