import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // აფრთხილებს Vercel-ს, რომ ბილდვის დროს ESLint-ის შეცდომები გამოტოვოს
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;