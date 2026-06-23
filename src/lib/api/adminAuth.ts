import { getAuth } from "@clerk/nextjs/server";
import type { NextApiRequest, NextApiResponse } from "next";

interface AdminAuthContext {
  userId: string;
  orgId: string;
}

export function requireAdminOrg(
  req: NextApiRequest,
  res: NextApiResponse,
): AdminAuthContext | null {
  const { userId, orgId } = getAuth(req);
  const adminOrgId = process.env.ZURICHJS_ADMIN_ORG_ID;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  if (!adminOrgId) {
    console.error("ZURICHJS_ADMIN_ORG_ID is not configured");
    res.status(500).json({ error: "Admin authorization is not configured" });
    return null;
  }

  if (orgId !== adminOrgId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return { userId, orgId };
}
