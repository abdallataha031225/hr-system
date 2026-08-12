import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["jose", "jwks-rsa", "firebase-admin"],
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;
