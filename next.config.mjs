/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.beehiiv.com" }],
  },
  experimental: {
    // opengraph-image.tsx reads these two font files from disk at request time.
    // Nothing imports them, so tracing cannot infer them and the lambda would
    // ship without them, which fails at request time rather than at build time.
    outputFileTracingIncludes: {
      "/opengraph-image": [
        "./node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
        "./node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff",
        "./node_modules/@fontsource/fraunces/files/fraunces-latin-600-italic.woff",
      ],
    },
  },
};
export default nextConfig;
