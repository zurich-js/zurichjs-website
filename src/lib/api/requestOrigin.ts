import type { NextApiRequest } from "next";

function isLocalHost(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export function getTrustedRequestOrigin(req: NextApiRequest) {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_BASE_URL is required for checkout redirects in production");
  }

  const host = req.headers.host;

  if (!host) {
    throw new Error("Unable to determine request origin");
  }

  if (!isLocalHost(host)) {
    throw new Error("NEXT_PUBLIC_BASE_URL is required for non-local checkout redirects");
  }

  return `http://${host}`;
}
