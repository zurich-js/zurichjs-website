import { trace, context, propagation, SpanStatusCode, Span } from '@opentelemetry/api';
import { NextApiRequest, NextApiResponse } from 'next';

import { getTracer } from './instrumentation';

/**
 * Type definition for Next.js API route handler
 */
type NextApiHandler<T = unknown> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => void | Promise<void>;

/**
 * Higher-order function to wrap API routes with OpenTelemetry tracing
 * This automatically creates spans for each API request and correlates with frontend traces
 */
export function withTelemetry<T = unknown>(
  handler: NextApiHandler<T>,
  options?: {
    spanName?: string;
    attributes?: Record<string, string | number | boolean>;
  }
): NextApiHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    // Skip if telemetry is not enabled
    if (!process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY) {
      return handler(req, res);
    }

    const tracer = getTracer();
    
    // Extract trace context from incoming request headers
    const extractedContext = propagation.extract(context.active(), req.headers);
    
    // Create span name from route or use provided name
    const spanName = options?.spanName || `${req.method} ${req.url}`;
    
    return context.with(extractedContext, () => {
      return tracer.startActiveSpan(spanName, async (span: Span) => {
        try {
          // Set standard HTTP attributes
          span.setAttribute('http.method', req.method || 'UNKNOWN');
          span.setAttribute('http.url', req.url || '');
          span.setAttribute('http.target', req.url || '');
          span.setAttribute('http.host', req.headers.host || '');
          span.setAttribute('http.scheme', req.headers['x-forwarded-proto'] || 'http');
          span.setAttribute('http.user_agent', req.headers['user-agent'] || '');
          
          // Add query parameters as attributes (be careful with sensitive data)
          if (req.query && Object.keys(req.query).length > 0) {
            span.setAttribute('http.query', JSON.stringify(req.query));
          }
          
          // Add custom attributes if provided
          if (options?.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
              span.setAttribute(key, value);
            });
          }

          // Store original res.status and res.json to capture response info
          const originalStatus = res.status.bind(res);
          const originalJson = res.json.bind(res);
          const originalSend = res.send.bind(res);

          // Override res.status to capture status code
          res.status = function(statusCode: number) {
            span.setAttribute('http.status_code', statusCode);
            
            if (statusCode >= 400) {
              span.setStatus({ 
                code: SpanStatusCode.ERROR,
                message: `HTTP ${statusCode}` 
              });
            }
            
            return originalStatus(statusCode);
          };

          // Override res.json to capture response
          res.json = function(body: T) {
            // Only log response body in development or for errors
            if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
              span.setAttribute('http.response.body', JSON.stringify(body));
            }
            
            return originalJson(body);
          };

          // Override res.send to capture response
          res.send = function(body: T) {
            // Capture final status code
            span.setAttribute('http.status_code', res.statusCode);
            
            return originalSend(body);
          };

          // Execute the actual handler
          await handler(req, res);

          // Set success status
          span.setAttribute('http.status_code', res.statusCode || 200);
          
          if (res.statusCode < 400) {
            span.setStatus({ code: SpanStatusCode.OK });
          }

        } catch (error) {
          // Record the exception
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          
          // Re-throw the error to be handled by Next.js
          throw error;
        } finally {
          span.end();
        }
      });
    });
  };
}

/**
 * Middleware to extract user information from Clerk and add to span
 */
export function withUserContext<T = unknown>(
  handler: NextApiHandler<T>
): NextApiHandler<T> {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    const activeSpan = trace.getActiveSpan();
    
    if (activeSpan) {
      // Try to extract user info from Clerk session
      // This assumes you're using Clerk's API route helpers
      try {
        const userId = (req as unknown as { auth?: { userId?: string } }).auth?.userId;
        
        if (userId) {
          activeSpan.setAttribute('user.id', userId);
          activeSpan.setAttribute('user.authenticated', true);
        } else {
          activeSpan.setAttribute('user.authenticated', false);
        }
      } catch (error) {
        // Silently fail - user context is optional
        console.debug('Failed to extract user context:', error);
      }
    }

    return handler(req, res);
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware<T = unknown>(
  ...middlewares: ((handler: NextApiHandler<T>) => NextApiHandler<T>)[]
): (handler: NextApiHandler<T>) => NextApiHandler<T> {
  return (handler: NextApiHandler<T>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Helper to create a child span within an API route
 */
export async function createChildSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

