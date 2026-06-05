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

  // Allow cross-origin HMR / dev resources when accessing the dev server
  // from another device on the LAN (e.g. phone, laptop at 192.168.100.119).
  // Add any other IPs you use for dev here.
  allowedDevOrigins: [
    '192.168.100.119',
    'localhost',
    '127.0.0.1',
    // '192.168.1.XXX', // add your other dev machine IPs as needed
  ],

  experimental: {
    // Speeds up dev compilation significantly by pre-optimizing imports
    // for these commonly used (and sometimes slow-to-tree-shake) packages.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'sonner',
      '@tanstack/react-query',
      // 'lightweight-charts', // enable if you see slow chart compiles
    ],
  },
};

export default nextConfig;
