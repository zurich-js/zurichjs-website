import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/admin(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export const onRequest = clerkMiddleware((auth, context) => {
  const { userId, orgId } = auth();

  // Protect auth-required routes
  if (isProtectedRoute(context.request)) {
    if (!userId) {
      return context.redirect('/');
    }
  }

  // Protect admin routes - require org membership
  if (isAdminRoute(context.request)) {
    const adminOrgId = import.meta.env.ZURICHJS_ADMIN_ORG_ID;
    if (!orgId || orgId !== adminOrgId) {
      return context.redirect('/');
    }
  }

  // Survey redirect check for authenticated users
  if (userId) {
    const url = new URL(context.request.url);
    // Skip redirect for the survey page itself and API routes
    if (url.pathname !== '/profile/survey' && !url.pathname.startsWith('/api/')) {
      // Note: Survey completion check happens client-side in the Header/AuthCheck island
      // because unsafeMetadata isn't available in middleware without an API call.
      // The client-side check in the React island handles the redirect.
    }
  }
});
