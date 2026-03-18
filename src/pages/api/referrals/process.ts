import type { APIContext } from 'astro';

export const prerender = false;

// Example API route to process referrals
// In a real implementation, you would connect to a database
// and store/update referral information

export async function POST(context: APIContext) {
  try {
    const { referrerId, userId, purchaseType } = await context.request.json();
    // userEmail is also available in the body but not used in this example

    // Validate required fields
    if (!referrerId || !userId) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In a real implementation, you would:
    // 1. Verify that the referrerId exists in your database
    // 2. Check if this is a valid referral (e.g., not self-referral, not duplicate)
    // 3. Update the referrer's credit balance
    // 4. Record the referral in your database

    // For this example, we'll simulate success
    console.log(`Processing referral: User ${userId} was referred by ${referrerId} for ${purchaseType}`);

    // Credit values based on purchase type
    const creditValues = {
      workshop: 200,
      event: 100,
      other: 50
    };

    const creditAmount = creditValues[purchaseType as keyof typeof creditValues] || 50;

    // Mock response with referrer info
    // In a real implementation, you would fetch this from your database
    return new Response(JSON.stringify({
      success: true,
      referrer: {
        id: referrerId,
        email: 'referrer@example.com', // This would come from your database
        creditAmount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
