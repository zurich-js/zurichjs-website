import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface CouponData {
  id: string;
  code: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  name?: string;
  isValid: boolean;
}

export function useCoupon() {
  const router = useRouter();
  const { coupon: couponCode } = router.query;
  
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate the coupon when couponCode changes
  useEffect(() => {
    if (!couponCode) {
      setCouponData(null);
      return;
    }

    const validateCoupon = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stripe/validate-coupon?code=${couponCode}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to validate coupon');
        }
        
        const data = await response.json();
        setCouponData(data);
      } catch (err) {
        console.error('Error validating coupon:', err);
        setError((err as Error).message);
        setCouponData(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateCoupon();
  }, [couponCode]);

  // Calculate the discount for a given price
  const applyDiscount = (price: number): number => {
    if (!couponData || !couponData.isValid) return price;

    if (couponData.percentOff) {
      return price * (1 - couponData.percentOff / 100);
    }

    if (couponData.amountOff && couponData.currency === 'chf') {
      return Math.max(0, price - couponData.amountOff / 100);
    }

    return price;
  };

  return {
    couponCode: couponCode as string | undefined,
    couponData,
    isLoading,
    error,
    applyDiscount,
  };
} 