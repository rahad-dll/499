import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ../package-lock.json is an empty stub that makes Next infer the parent
  // folder as the workspace root; pin it to this app so file watching works.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
