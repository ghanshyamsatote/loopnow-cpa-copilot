import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (only the files
  // actually needed at runtime) — this is what keeps the Docker image small
  // and avoids copying the full node_modules tree into the final image.
  output: "standalone",
};

export default nextConfig;
