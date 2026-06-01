import { withBotId } from "botid/next/config";
import path from "node:path";
import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";
const repoRoot = process.cwd().replaceAll("\\", "/").endsWith("/apps/web")
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const nextConfig: NextConfig = {
  ...(basePath
    ? {
        basePath,
        assetPrefix: "/demo-assets",
        redirects: async () => [
          {
            source: "/",
            destination: basePath,
            permanent: false,
            basePath: false,
          },
        ],
      }
    : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  cacheComponents: true,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/events/*": ["../../schemas/events/**/*"],
    "/openapi/*": ["../../schemas/openapi/**/*"],
    "/schemas/*": ["../../schemas/json/**/*"],
  },
  poweredByHeader: false,
  reactCompiler: true,
  transpilePackages: ["@boreal/ui"],
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    prefetchInlining: true,
    cachedNavigations: true,
    appNewScrollHandler: true,
    inlineCss: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default withBotId(nextConfig);
