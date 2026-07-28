import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // the parent folder holds the PPT generator and its own lockfile; pin the
  // trace root here so Next doesn't walk up into it
  outputFileTracingRoot: __dirname,
  experimental: {
    // matches the 8 MB cap enforced in uploadSubmission (app/actions.ts) — the
    // server action's own body limit defaults to 1 MB and rejects the file first
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
