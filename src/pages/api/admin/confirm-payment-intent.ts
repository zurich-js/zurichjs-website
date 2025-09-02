import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({ error: 'Missing paymentIntentId' });
  }

  try {
    // In a real Stripe Terminal implementation, the payment would be confirmed
    // by the Terminal SDK after collecting the payment method from the card reader
    // For this demo, we'll simulate the confirmation and capture process
    
    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'requires_payment_method') {
      // In a real implementation, this would be handled by Terminal SDK
      // For demo purposes, we'll simulate successful payment method collection
      
      // Since we can't actually use Terminal SDK in a web environment,
      // we'll create a new payment intent with automatic confirmation
      // This is just for demonstration - real implementation would use Terminal SDK
      
      // Create a test payment method first
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa', // Test token for simulation
        },
      });

      const simulatedPayment = await stripe.paymentIntents.create({
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        receipt_email: paymentIntent.receipt_email || undefined,
        metadata: paymentIntent.metadata,
        description: paymentIntent.description || undefined,
        confirm: true,
        payment_method: paymentMethod.id,
        return_url: `${req.headers.origin}/admin/tap-to-pay`,
      });

      return res.status(200).json({
        paymentIntent: {
          id: simulatedPayment.id,
          status: simulatedPayment.status,
          amount: simulatedPayment.amount,
          currency: simulatedPayment.currency,
        },
        message: 'Payment processed successfully (simulated)',
      });
    } else if (paymentIntent.status === 'requires_capture') {
      // Capture the payment
      const capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
      
      return res.status(200).json({
        paymentIntent: {
          id: capturedPayment.id,
          status: capturedPayment.status,
          amount: capturedPayment.amount,
          currency: capturedPayment.currency,
        },
        message: 'Payment captured successfully',
      });
    } else {
      return res.status(400).json({ 
        error: `Payment intent is in ${paymentIntent.status} status and cannot be processed` 
      });
    }
  } catch (err: unknown) {
    console.error('Error confirming payment intent:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}