/**
 * Client-side utilities for Multiplayer session recording
 * These functions provide a convenient way to track custom events and errors
 */

/**
 * Safely get SessionRecorder instance (browser only)
 */
async function getSessionRecorder() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const sessionRecorderModule = await import('@multiplayer-app/session-recorder-browser');
    return sessionRecorderModule.default;
  } catch (error) {
    console.warn('Failed to load SessionRecorder:', error);
    return null;
  }
}

/**
 * Track a custom event in the session recording
 * Use this to track important user actions or application events
 */
export async function trackEvent(
  eventName: string,
  attributes?: Record<string, string | number | boolean>
) {
  const SessionRecorder = await getSessionRecorder();
  if (!SessionRecorder) return;
  
  try {
    SessionRecorder.recordEvent({
      name: eventName,
      attributes,
    });
  } catch (error) {
    console.warn('Failed to record event:', error);
  }
}

/**
 * Track an error in the session recording
 * Use this to capture and track application errors
 */
export async function trackError(
  error: Error | string,
  context?: Record<string, string | number | boolean>
) {
  const SessionRecorder = await getSessionRecorder();
  if (!SessionRecorder) return;
  
  try {
    SessionRecorder.recordError({
      error: error instanceof Error ? error : new Error(error),
      context,
    });
  } catch (err) {
    console.warn('Failed to record error:', err);
  }
}

/**
 * Update session attributes
 * Use this to add or update user/session information
 */
export async function updateSessionAttributes(
  attributes: Record<string, string | number | boolean>
) {
  const SessionRecorder = await getSessionRecorder();
  if (!SessionRecorder) return;
  
  try {
    SessionRecorder.setSessionAttributes(attributes);
  } catch (error) {
    console.warn('Failed to set session attributes:', error);
  }
}

/**
 * Track a page view
 * This is automatically handled by the SDK, but you can use this for SPAs
 */
export async function trackPageView(pageName: string, additionalAttributes?: Record<string, string | number | boolean>) {
  await trackEvent('page_view', {
    page_name: pageName,
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    ...additionalAttributes,
  });
}

/**
 * Track a button click
 */
export async function trackButtonClick(buttonName: string, additionalAttributes?: Record<string, string | number | boolean>) {
  await trackEvent('button_click', {
    button_name: buttonName,
    ...additionalAttributes,
  });
}

/**
 * Track a form submission
 */
export async function trackFormSubmit(formName: string, additionalAttributes?: Record<string, string | number | boolean>) {
  await trackEvent('form_submit', {
    form_name: formName,
    ...additionalAttributes,
  });
}

/**
 * Track an API call
 */
export async function trackApiCall(
  endpoint: string,
  method: string,
  statusCode?: number,
  additionalAttributes?: Record<string, string | number | boolean>
) {
  await trackEvent('api_call', {
    api_endpoint: endpoint,
    api_method: method,
    ...(statusCode && { api_status_code: statusCode }),
    ...additionalAttributes,
  });
}

/**
 * Track user authentication
 */
export async function trackAuth(action: 'login' | 'logout' | 'signup', userId?: string) {
  await trackEvent('auth', {
    auth_action: action,
    ...(userId && { user_id: userId }),
  });
}

/**
 * Track e-commerce events
 */
export async function trackPurchase(
  productId: string,
  productName: string,
  price: number,
  currency: string = 'USD',
  additionalAttributes?: Record<string, string | number | boolean>
) {
  await trackEvent('purchase', {
    product_id: productId,
    product_name: productName,
    price,
    currency,
    ...additionalAttributes,
  });
}

/**
 * Track checkout started
 */
export async function trackCheckoutStarted(
  items: Array<{ id: string; name: string; price: number }>,
  totalAmount: number,
  additionalAttributes?: Record<string, string | number | boolean>
) {
  await trackEvent('checkout_started', {
    items_count: items.length,
    total_amount: totalAmount,
    items: JSON.stringify(items),
    ...additionalAttributes,
  });
}

/**
 * Track search events
 */
export async function trackSearch(query: string, resultsCount?: number) {
  await trackEvent('search', {
    search_query: query,
    ...(resultsCount !== undefined && { results_count: resultsCount }),
  });
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(featureName: string, additionalAttributes?: Record<string, string | number | boolean>) {
  await trackEvent('feature_usage', {
    feature_name: featureName,
    ...additionalAttributes,
  });
}

/**
 * Higher-order function to wrap async functions with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, string | number | boolean>
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error as Error, {
        function_name: fn.name || 'anonymous',
        ...context,
      });
      throw error;
    }
  }) as T;
}

/**
 * React hook for tracking component lifecycle
 */
export function useSessionRecorder() {
  return {
    trackEvent,
    trackError,
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackApiCall,
    trackAuth,
    trackPurchase,
    trackCheckoutStarted,
    trackSearch,
    trackFeatureUsage,
    updateSessionAttributes,
  };
}

