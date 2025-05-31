/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MIRO_CLIENT_ID: process.env.NEXT_PUBLIC_MIRO_CLIENT_ID,
    NEXT_PUBLIC_MIRO_REDIRECT_URI: process.env.NEXT_PUBLIC_MIRO_REDIRECT_URI,
  },
  // サーバーサイドでのみ使用する環境変数はここでは設定しない
};

module.exports = nextConfig;
