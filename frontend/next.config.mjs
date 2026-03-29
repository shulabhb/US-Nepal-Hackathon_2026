/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /** Allow `quality={100}` on next/image (landing screenshots). Default is [75] in Next 16+. */
    qualities: [75, 100],
  },
};

export default nextConfig;
