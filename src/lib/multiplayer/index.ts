/**
 * Multiplayer.app Full-Stack Session Recording Integration
 * 
 * This module provides utilities for integrating Multiplayer.app session recording
 * across both frontend and backend of your Next.js application.
 * 
 * Backend Usage:
 * ```typescript
 * import { withTelemetry, createChildSpan } from '@/lib/multiplayer';
 * 
 * export default withTelemetry(async function handler(req, res) {
 *   await createChildSpan('database-query', async (span) => {
 *     const data = await db.query('SELECT * FROM users');
 *     span.setAttribute('rows_returned', data.length);
 *     return data;
 *   });
 *   
 *   res.json({ success: true });
 * });
 * ```
 * 
 * Frontend Usage:
 * ```typescript
 * import { trackEvent, trackError } from '@/lib/multiplayer';
 * 
 * function MyComponent() {
 *   const handleClick = () => {
 *     trackEvent('button_clicked', { button_name: 'submit' });
 *   };
 *   
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */

// Backend exports
export {
  initializeBackendTelemetry,
  getTracer,
  traceAsyncFunction,
  traceSyncFunction,
  getCurrentTraceContext,
  setTraceContextFromHeaders,
  recordEvent,
  recordError,
} from './instrumentation';

export {
  withTelemetry,
  withUserContext,
  composeMiddleware,
  createChildSpan,
} from './middleware';

// Frontend exports
export {
  trackEvent,
  trackError,
  updateSessionAttributes,
  trackPageView,
  trackButtonClick,
  trackFormSubmit,
  trackApiCall,
  trackAuth,
  trackPurchase,
  trackCheckoutStarted,
  trackSearch,
  trackFeatureUsage,
  withErrorTracking,
  useSessionRecorder,
} from './client';

