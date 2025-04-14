import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/admin/(.*)'])

const ZURICHJS_ORG_ID = process.env.ZURICHJS_ADMIN_ORG_ID


export default clerkMiddleware(async (auth, req) => {

  // Handle protected routes
  if (isProtectedRoute(req)) {
    const { orgId } = await auth()

    if (orgId !== ZURICHJS_ORG_ID) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};