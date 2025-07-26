import { NextApiRequest, NextApiResponse } from 'next';

import { sendPlatformNotification } from '@/lib/notification';
import { stripe } from '@/lib/stripe';

interface TshirtPurchaseSuccessBody {
  sessionId: string;
  userEmail: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, userEmail } = req.body as TshirtPurchaseSuccessBody;

    // Retrieve session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    // Get order details from session metadata
    const sizeQuantities = session.metadata?.sizeQuantities ? JSON.parse(session.metadata.sizeQuantities) : {};
    const delivery = session.metadata?.delivery === 'true';
    const totalQuantity = parseInt(session.metadata?.totalQuantity || '0');
    const sessionEmail = session.metadata?.userEmail || '';
    const couponCode = session.metadata?.couponCode || '';
    
    // Get payment information
    const paymentIntent = session.payment_intent;
    const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || 'Unknown';
    
    const totalAmount = session.amount_total ? (session.amount_total / 100) : 0;
    
    // Format sizes for display
    const sizesDisplay = Object.entries(sizeQuantities)
      .filter(([, qty]) => (qty as number) > 0)
      .map(([size, qty]) => `${size} (${qty})`)
      .join(', ');
    
    // Get coupon information
    let couponInfo = '';
    if (couponCode) {
      couponInfo = `\nCoupon Used: ${couponCode}`;
    }
    if (session.total_details?.amount_discount && session.total_details.amount_discount > 0) {
      const discountAmount = session.total_details.amount_discount / 100;
      couponInfo += `\nDiscount Applied: CHF ${discountAmount}`;
    }

    // Use the best available email
    const customerEmail = userEmail || sessionEmail || 'Unknown';

    // Send platform notification
    await sendPlatformNotification({
      title: '💳 Card T-shirt Order',
      message: `New online payment t-shirt order

Payment Intent ID: ${paymentIntentId}
Customer Email: ${customerEmail}
Sizes Ordered: ${sizesDisplay}
Total Quantity: ${totalQuantity}
Total Amount: CHF ${totalAmount}
Delivery Method: ${delivery ? 'Home Delivery' : 'Meetup Pickup'}${couponInfo}
Session ID: ${sessionId}`,
      priority: 1,
    });

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('Failed to send tshirt purchase notification:', err);
    const error = err as { message: string };
    
    return res.status(500).json({
      error: error.message || 'An unknown error occurred',
    });
  }
} 