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
    // Kept above the 8 MB app-level cap in uploadSubmission (app/actions.ts) on
    // purpose: if this equals the app cap, Next's own body-size limit rejects
    // oversized requests before uploadSubmission's code ever runs, producing a
    // raw framework error page instead of the friendly { error } message. The
    // server action's own body limit defaults to 1 MB and rejects the file
    // first if unset entirely.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
