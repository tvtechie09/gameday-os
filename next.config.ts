import type { NextConfig } from "next";

export function buildContentSecurityPolicy(nodeEnv: string | undefined): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (nodeEnv === "development") scriptSources.push("'unsafe-eval'");

  return `default-src 'self'; script-src ${scriptSources.join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: buildContentSecurityPolicy(process.env.NODE_ENV) }
      ]
    }];
  }
};

export default nextConfig;
