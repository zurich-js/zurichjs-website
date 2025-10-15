declare module '@multiplayer-app/session-recorder-browser' {
  export interface SessionRecorderConfig {
    /**
     * The name of your application
     */
    application: string;
    
    /**
     * The version of your application
     */
    version: string;
    
    /**
     * The environment where your application is running (e.g., 'production', 'staging', 'development')
     */
    environment: string;
    
    /**
     * Your Multiplayer API key (OTLP key)
     */
    apiKey: string;
    
    /**
     * Optional: CORS URLs for trace header propagation
     * Use this to propagate trace context to your backend APIs
     */
    propagateTraceHeaderCorsUrls?: RegExp[];
    
    /**
     * Optional: Custom endpoint for sending telemetry data
     */
    endpoint?: string;
    
    /**
     * Optional: Enable debug mode for development
     */
    debug?: boolean;
  }

  export interface SessionAttributes {
    /**
     * User ID to associate with the session
     */
    userId?: string;
    
    /**
     * User name to associate with the session
     */
    userName?: string;
    
    /**
     * User email to associate with the session
     */
    userEmail?: string;
    
    /**
     * Additional custom attributes as key-value pairs
     */
    [key: string]: string | number | boolean | undefined;
  }

  export interface CustomEventOptions {
    /**
     * Name of the custom event
     */
    name: string;
    
    /**
     * Additional attributes for the event
     */
    attributes?: Record<string, string | number | boolean>;
  }

  export interface ErrorEventOptions {
    /**
     * The error object or message
     */
    error: Error | string;
    
    /**
     * Additional context about the error
     */
    context?: Record<string, string | number | boolean>;
  }

  interface SessionRecorder {
    /**
     * Initialize the SessionRecorder with configuration
     */
    init(config: SessionRecorderConfig): void;
    
    /**
     * Set session attributes to associate with the current session
     * These attributes will be attached to all telemetry data
     */
    setSessionAttributes(attributes: SessionAttributes): void;
    
    /**
     * Record a custom event
     */
    recordEvent(options: CustomEventOptions): void;
    
    /**
     * Record an error event
     */
    recordError(options: ErrorEventOptions): void;
    
    /**
     * Start a new trace span
     */
    startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
    
    /**
     * Get the current trace context
     */
    getTraceContext(): TraceContext | null;
  }

  interface Span {
    /**
     * End the span
     */
    end(): void;
    
    /**
     * Set an attribute on the span
     */
    setAttribute(key: string, value: string | number | boolean): void;
    
    /**
     * Record an exception on the span
     */
    recordException(error: Error): void;
  }

  interface TraceContext {
    /**
     * Trace ID
     */
    traceId: string;
    
    /**
     * Span ID
     */
    spanId: string;
    
    /**
     * Trace flags
     */
    traceFlags: number;
  }

  const SessionRecorder: SessionRecorder;
  export default SessionRecorder;
}
