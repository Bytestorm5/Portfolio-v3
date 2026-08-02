import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Dockerfile ship a minimal runtime image. Vercel ignores this.
  output: "standalone",

  // The driver has optional native add-ons it require()s conditionally;
  // bundling it makes those resolve at build time and fail. Leave it external.
  serverExternalPackages: ["mongodb"],

  // The org logos in public/icons are first-party SVGs. next/image refuses SVG
  // by default because a remote one could carry script; these are local, and
  // the sandbox CSP below neutralises the vector anyway.
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
