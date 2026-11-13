/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // the Charts tab reads the committed Find Us snapshots with fs at render time
  experimental: { outputFileTracingIncludes: { "/": ["./data/snapshots/*/sites.tesla-customer-owned.json", "./data/sites.tesla-customer-owned.json"] } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.beehiiv.com" }],
  },
};
export default nextConfig;
