import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

// Initialize telemetry SDK (singleton)
let sdkInstance: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry instrumentation for the backend
 * This should be called once when the application starts
 */
export function initializeBackendTelemetry(): NodeSDK | null {
  // Only initialize if API key is present and we haven't already initialized
  if (!process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY || sdkInstance) {
    return sdkInstance;
  }

  try {
    const traceExporter = new OTLPTraceExporter({
      url: 'https://otlp.multiplayer.app/v1/traces',
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_MULTIPLAYER_OTLP_KEY,
      },
    });

    const sdk = new NodeSDK({
      serviceName: 'zurichjs-website-backend',
      traceExporter,
      instrumentations: [
        new HttpInstrumentation({
          // Ignore health check endpoints
          ignoreIncomingRequestHook: (request) => {
            return request.url?.includes('/health') || false;
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();
    sdkInstance = sdk;

    console.log('✅ Multiplayer backend telemetry initialized');
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.error('Error terminating tracing', error))
        .finally(() => process.exit(0));
    });

    return sdk;
  } catch (error) {
    console.error('Failed to initialize backend telemetry:', error);
    return null;
  }
}

/**
 * Get the tracer instance for creating custom spans
 */
export function getTracer() {
  return trace.getTracer('zurichjs-website-backend', '1.0.0');
}

/**
 * Wrapper to trace async functions with automatic error handling
 */
export async function traceAsyncFunction<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      // Add custom attributes
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

/**
 * Wrapper to trace synchronous functions with automatic error handling
 */
export function traceSyncFunction<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, string | number | boolean>
): T {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(spanName, (span) => {
    try {
      // Add custom attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      const result = fn(span);
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

/**
 * Get the current trace context for propagating to frontend
 */
export function getCurrentTraceContext() {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return null;
  }

  const spanContext = activeSpan.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

/**
 * Set trace context from incoming request headers
 * This is used to correlate frontend and backend traces
 */
export function setTraceContextFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const traceparent = headers['traceparent'];
  
  if (typeof traceparent === 'string') {
    // Parse W3C traceparent header
    // Format: version-traceId-spanId-flags
    const parts = traceparent.split('-');
    if (parts.length === 4) {
      // The context is automatically propagated by the HTTP instrumentation
      // This function is here for custom handling if needed
      return {
        version: parts[0],
        traceId: parts[1],
        spanId: parts[2],
        flags: parts[3],
      };
    }
  }
  
  return null;
}

/**
 * Record a custom event in the current span
 */
export function recordEvent(
  eventName: string,
  attributes?: Record<string, string | number | boolean>
) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(eventName, attributes);
  }
}

/**
 * Record an error in the current span
 */
export function recordError(error: Error, attributes?: Record<string, string | number | boolean>) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.recordException(error);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        activeSpan.setAttribute(`error.${key}`, value);
      });
    }
  }
}

