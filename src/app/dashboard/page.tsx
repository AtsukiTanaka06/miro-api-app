"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/integrations"
          className="block p-6 bg-white border rounded-lg shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold mb-2">サービス連携</h2>
          <p className="text-gray-600">
            Miroなどの外部サービスとの連携を管理します。
          </p>
        </Link>
        <Link
          href="/dashboard/mindmap"
          className="block p-6 bg-white border rounded-lg shadow hover:bg-gray-50"
        >
          <h2 className="text-xl font-semibold mb-2">マインドマップ</h2>
          <p className="text-gray-600">
            マインドマップの作成と管理を行います。
          </p>
        </Link>
      </div>
    </div>
  );
}
