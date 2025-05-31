"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkAuth();
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Miro API Integration
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Miro APIを使用してマインドマップを簡単に作成できます。
          </p>
          <div className="space-y-4">
            <Link
              href="/api/auth/login"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Miroでログイン
            </Link>
            <div className="text-sm text-gray-500">
              ※Miroアカウントが必要です
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
