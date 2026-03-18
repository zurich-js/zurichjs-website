import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

// Define the possible order by fields that Clerk API accepts
type OrderByField = 'created_at' | 'updated_at' | 'email_address' | 'web3wallet' |
                    'first_name' | 'last_name' | 'phone_number' | 'username' |
                    'last_active_at' | 'last_sign_in_at';
type WithSign<T extends string> = T | `-${T}` | `+${T}`;

// Define the type for query parameters matching Clerk's expected format
interface UserQueryParams {
  limit: number;
  offset: number;
  orderBy: WithSign<OrderByField>;
  query?: string;
}

export async function GET(context: APIContext) {
  try {
    const page = context.url.searchParams.get('page');
    const limit = context.url.searchParams.get('limit');
    const query = context.url.searchParams.get('query') || '';

    console.log('Users API: Processing request', { page, limit, query });

    // If no page or limit provided, return all users
    if (!page || !limit) {
      console.log('Users API: No pagination provided, fetching all users');

      const client = await clerkClient();
      const queryParams: UserQueryParams = {
        limit: 500, // Use a high limit to get all users
        offset: 0,
        orderBy: '-created_at',
      };

      if (query) {
        queryParams.query = query;
      }

      const { data: users, totalCount } = await client.users.getUserList(queryParams);

      return new Response(JSON.stringify({
        users: users || [],
        pagination: {
          total: totalCount || 0,
          pages: 1,
          page: 1,
          limit: totalCount || 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    console.log('Users API: Initializing Clerk client');

    // Initialize the clerk client - fixed to match user-stats.ts
    const client = await clerkClient();

    // Fetch users with pagination parameters
    const queryParams: UserQueryParams = {
      limit: limitNumber,
      offset,
      orderBy: '-created_at',
    };

    // Add search query if provided
    if (query) {
      queryParams.query = query;
    }

    console.log('Users API: Calling getUserList with params', queryParams);

    try {
      const { data: users, totalCount } = await client.users.getUserList(queryParams);

      // Debug logs to help identify issues
      console.log(`Users API: Found ${users?.length || 0} users, total count: ${totalCount || 0}`);

      if (!users || users.length === 0) {
        console.log('Users API: No users found, checking if we can get a count');
        // See if we can at least get a count to verify the API is working
        const count = await client.users.getCount();
        console.log(`Users API: Total user count: ${count}`);
      }

      return new Response(JSON.stringify({
        users: users || [],
        pagination: {
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limitNumber),
          page: pageNumber,
          limit: limitNumber
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (innerError) {
      console.error('Users API: Error during Clerk API call:', innerError);
      throw innerError; // Re-throw to be caught by outer try/catch
    }
  } catch (error: unknown) {
    console.error('Error fetching users:', error);

    // Send detailed error for debugging
    return new Response(JSON.stringify({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
