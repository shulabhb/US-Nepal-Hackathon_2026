/** @type {import('next').NextConfig} */
const backendProxyUrl = (
  process.env.BACKEND_PROXY_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig = {
  images: {
    /** Allow `quality={100}` on next/image (landing screenshots). Default is [75] in Next 16+. */
    qualities: [75, 100],
  },
  /**
   * Proxy API calls under `/burnout-api/*` to the FastAPI backend so the browser can use
   * same-origin URLs (e.g. `NEXT_PUBLIC_API_BASE_URL=/burnout-api`) — one public tunnel
   * to Next is enough for remote demos. See `docs/tunnel.md`.
   */
  async rewrites() {
    return [
      {
        source: "/burnout-api/:path*",
        destination: `${backendProxyUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
