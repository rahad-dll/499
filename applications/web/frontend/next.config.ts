import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ../package-lock.json is an empty stub that makes Next infer the parent
  // folder as the workspace root; pin it to this app so file watching works.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // The 3D city tour is a static build in public/3d. Its asset paths are
  // relative, so it must be opened as /3d/index.html.
  async redirects() {
    return [{ source: "/3d", destination: "/3d/index.html", permanent: false }];
  },

  async headers() {
    return [
      // Vite file names carry a content hash: cache them for good, so repeat
      // visits don't download the 3D engine again.
      {
        source: "/3d/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/3d/:dir(models|showcase|brand)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
