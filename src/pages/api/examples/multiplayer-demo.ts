import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry, createChildSpan } from '@/lib/multiplayer';

/**
 * Example API route demonstrating Multiplayer.app integration
 * This shows how to use the telemetry middleware and create custom spans
 */



type ResponseData = {
  success: boolean;
  message: string;
  data?: unknown;
  traceId?: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // Example 1: Create a child span for a database operation
    const users = await createChildSpan(
      'fetch-users-from-database',
      async (span) => {
        // Simulate a database query
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        const mockUsers = [
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' },
        ];

        // Add custom attributes to the span
        span.setAttribute('db.system', 'postgresql');
        span.setAttribute('db.query', 'SELECT * FROM users');
        span.setAttribute('db.rows_returned', mockUsers.length);

        return mockUsers;
      }
    );

    // Example 2: Create a child span for an external API call
    const externalData = await createChildSpan(
      'call-external-api',
      async (span) => {
        // Simulate an external API call
        await new Promise((resolve) => setTimeout(resolve, 150));

        span.setAttribute('http.method', 'GET');
        span.setAttribute('http.url', 'https://api.example.com/data');
        span.setAttribute('http.status_code', 200);

        return { status: 'ok', timestamp: new Date().toISOString() };
      }
    );

    // Example 3: Create a child span for business logic
    const processedData = await createChildSpan(
      'process-user-data',
      async (span) => {
        // Simulate data processing
        await new Promise((resolve) => setTimeout(resolve, 50));

        const result = users.map((user) => ({
          ...user,
          processed: true,
          timestamp: externalData.timestamp,
        }));

        span.setAttribute('processing.users_count', users.length);
        span.setAttribute('processing.duration_ms', 50);

        return result;
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Data processed successfully',
      data: processedData,
    });
  } catch (error) {
    console.error('Error in multiplayer demo:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

// Wrap the handler with telemetry middleware
export default withTelemetry(handler, {
  spanName: 'multiplayer-demo-api',
  attributes: {
    'api.version': 'v1',
    'api.category': 'examples',
  },
});

