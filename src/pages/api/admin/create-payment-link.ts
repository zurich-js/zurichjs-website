import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cartItems, couponCode } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Missing required field: cartItems (must be non-empty array)' });
  }

  try {
    // Prepare line items from cart
    const lineItems = [];
    const productDetails = [];

    for (const item of cartItems) {
      if (!item.priceId || !item.quantity || !item.productId) {
        return res.status(400).json({ error: 'Each cart item must have priceId, quantity, and productId' });
      }

      // Validate the price and product exist
      await stripe.prices.retrieve(item.priceId);
      const product = await stripe.products.retrieve(item.productId);

      lineItems.push({
        price: item.priceId,
        quantity: item.quantity,
      });

      productDetails.push({
        id: product.id,
        name: product.name,
        description: product.description,
        quantity: item.quantity,
      });
    }

    // Note: Coupons will be handled via allow_promotion_codes
    // Users can enter coupon codes directly in the Stripe checkout
    if (couponCode) {
      try {
        // Validate coupon exists but don't store result
        await stripe.coupons.retrieve(couponCode);
      } catch (err) {
        console.warn(`Coupon ${couponCode} not found or invalid:`, err);
      }
    }

    // No customer creation - anonymous payments

    // Create Payment Link
    const paymentLinkParams: Stripe.PaymentLinkCreateParams = {
      line_items: lineItems,
      metadata: {
        products: JSON.stringify(productDetails),
        couponCode: couponCode || '',
        adminTapToPay: 'true',
        createdBy: 'admin-tap-to-pay',
        cartItemCount: cartItems.length.toString(),
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${req.headers.origin}/admin/tap-to-pay?payment=success`,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false,
      },
    };

    // Add shipping address collection for physical products
    const requiresShipping = productDetails.some(product => 
      product.name.toLowerCase().includes('shirt') ||
      product.name.toLowerCase().includes('hoodie') ||
      product.name.toLowerCase().includes('merch')
    );
    
    if (requiresShipping) {
      paymentLinkParams.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'CH'],
      };
    }

    // Coupons are handled via allow_promotion_codes in the payment link

    const paymentLink = await stripe.paymentLinks.create(paymentLinkParams);

    // Generate QR code for the payment link (you might want to use a QR code library)
    // For now, we'll use a simple QR code service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentLink.url)}`;

    return res.status(200).json({
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
        qr_code: qrCodeUrl,
      },
      products: productDetails,
    });
  } catch (err: unknown) {
    console.error('Error creating payment link:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}

export default handler;
