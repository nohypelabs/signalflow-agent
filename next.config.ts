import type { NextConfig } from "next";
import { readFileSync } from "fs";

let appVersion = "0.1.0";
try {
  const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
  appVersion = pkg.version || appVersion;
} catch {}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
