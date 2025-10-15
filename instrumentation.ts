/**
 * Next.js Instrumentation File
 * This file is automatically loaded by Next.js before any other code
 * Use it to initialize OpenTelemetry and other instrumentation
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeBackendTelemetry } = await import('./src/lib/multiplayer/instrumentation');
    initializeBackendTelemetry();
  }
}

