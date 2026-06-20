import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

const ZURICHJS_ORG_ID = process.env.ZURICHJS_ADMIN_ORG_ID;

export default clerkMiddleware(async (auth, req) => {
  // Handle protected routes
  if (isProtectedRoute(req)) {
    const { orgId } = await auth();

    if (orgId !== ZURICHJS_ORG_ID) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin(.*)"],
};
