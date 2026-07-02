const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker uchun minimal serverli build

  async rewrites() {
    // Faqat absolyut (http) API URL bo'lsa Next proxy qiladi (dev qulayligi uchun).
    // Production'da NEXT_PUBLIC_API_URL=/api bo'ladi va nginx /api ni backendga uzatadi.
    if (!/^https?:\/\//.test(apiUrl)) return [];
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
