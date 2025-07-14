import { NextApiRequest, NextApiResponse } from 'next';

import { stripe } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Coupon ID is required' });
  }

  if (req.method === 'DELETE') {
    try {
      // Delete the coupon from Stripe
      const deletedCoupon = await stripe.coupons.del(id);
      
      return res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
        coupon: deletedCoupon,
      });
    } catch (error) {
      console.error('Error deleting Stripe coupon:', error);
      
      // Handle specific Stripe errors
      if (error instanceof Error) {
        if (error.message.includes('No such coupon')) {
          return res.status(404).json({ 
            error: 'Coupon not found',
            message: 'The specified coupon does not exist or has already been deleted.'
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to delete coupon',
          message: error.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Unknown error occurred while deleting coupon'
      });
    }
  } else if (req.method === 'GET') {
    try {
      // Retrieve a specific coupon
      const coupon = await stripe.coupons.retrieve(id);
      
      return res.status(200).json({
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          duration_in_months: coupon.duration_in_months,
          max_redemptions: coupon.max_redemptions,
          times_redeemed: 0, // Would need to be calculated from checkout sessions
          valid: coupon.valid,
          created: coupon.created,
          redeem_by: coupon.redeem_by,
          metadata: coupon.metadata,
        }
      });
    } catch (error) {
      console.error('Error retrieving Stripe coupon:', error);
      
      if (error instanceof Error && error.message.includes('No such coupon')) {
        return res.status(404).json({ 
          error: 'Coupon not found',
          message: 'The specified coupon does not exist.'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to retrieve coupon',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 