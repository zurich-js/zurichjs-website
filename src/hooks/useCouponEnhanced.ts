import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';

import useEvents from './useEvents';

interface UseCouponEnhancedOptions {
  workshopId: string;
  workshopTitle: string;
  onCouponApplied?: () => void;
}

interface CouponDetails {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  name: string | null;
  isValid: boolean;
}

interface UseCouponEnhancedReturn {
  couponCode: string;
  setCouponCode: (code: string) => void;
  showCouponInput: boolean;
  setShowCouponInput: (show: boolean) => void;
  coupon: string | string[] | undefined;
  applyCoupon: () => void;
  removeCoupon: () => void;
  isCouponApplied: boolean;
  isCouponCodeValid: boolean;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  couponDetails: CouponDetails | null;
  isLoadingCoupon: boolean;
  couponError: string | null;
  isCommunityCoupon: boolean;
  couponStatusText: string;
}

export function useCouponEnhanced({
  workshopId,
  workshopTitle,
  onCouponApplied
}: UseCouponEnhancedOptions): UseCouponEnhancedReturn {
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponDetails, setCouponDetails] = useState<CouponDetails | null>(null);
  const [isLoadingCoupon, setIsLoadingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const { track } = useEvents();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { coupon } = router.query;
  const hasInitialized = useRef(false);
  const hasAutoAppliedCommunity = useRef(false);

  // Fetch coupon details from API
  const fetchCouponDetails = async (code: string) => {
    if (!code.trim()) {
      setCouponDetails(null);
      setCouponError(null);
      return;
    }

    setIsLoadingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch(`/api/stripe/validate-coupon?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (response.ok) {
        setCouponDetails(data);
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        setCouponDetails(null);
      }
    } catch (error) {
      setCouponError(`Failed to validate coupon\n${error});`);
      setCouponDetails(null);
    } finally {
      setIsLoadingCoupon(false);
    }
  };

  // Auto-apply community coupon for logged-in users
  useEffect(() => {
    if (isLoaded && user && !hasAutoAppliedCommunity.current) {
      // If user is logged in and no coupon in URL, add community coupon
      if (!coupon) {
        const currentQuery = { ...router.query };
        currentQuery.coupon = 'zurichjs-community';
        router.replace(
          {
            pathname: router.pathname,
            query: currentQuery
          },
          undefined,
          { shallow: false }
        );
        hasAutoAppliedCommunity.current = true;
      }
    }
  }, [isLoaded, user, coupon, router]);

  // Sync coupon from URL with input field when page loads
  useEffect(() => {
    if (coupon && typeof coupon === 'string' && !hasInitialized.current) {
      setCouponCode(coupon);
      hasInitialized.current = true;
    }
  }, [coupon]);

  // Fetch coupon details when coupon changes
  useEffect(() => {
    if (coupon && typeof coupon === 'string') {
      fetchCouponDetails(coupon);
    } else {
      setCouponDetails(null);
      setCouponError(null);
    }
  }, [coupon]);

  // Handle coupon application
  const applyCoupon = () => {
    if (couponCode.trim()) {
      const currentQuery = { ...router.query };
      currentQuery.coupon = couponCode.trim();
      router.replace(
        {
          pathname: router.pathname,
          query: currentQuery
        },
        undefined,
        { shallow: false } // Changed to false to ensure Stripe prices refresh
      );
      setShowCouponInput(false);

      // Track coupon application
      track('coupon_applied', {
        workshop_id: workshopId,
        workshop_title: workshopTitle,
        coupon_code: couponCode.trim()
      });

      // Call optional callback
      onCouponApplied?.();
    }
  };

  // Remove coupon
  const removeCoupon = () => {
    const currentQuery = { ...router.query };
    delete currentQuery.coupon;
    router.replace(
      {
        pathname: router.pathname,
        query: currentQuery
      },
      undefined,
      { shallow: false } // Changed to false to ensure Stripe prices refresh
    );

    // Track coupon removal
    track('coupon_removed', {
      workshop_id: workshopId,
      coupon_code: coupon as string
    });
  };

  // Check if coupon is applied
  const isCouponApplied = Boolean(coupon);

  // Check if coupon code is valid (not empty after trim)
  const isCouponCodeValid = Boolean(couponCode.trim());

  // Check if current coupon is the community coupon
  const isCommunityCoupon = coupon === 'zurichjs-community';

  // Determine status text based on coupon type and state
  const couponStatusText = (() => {
    if (isLoadingCoupon) return 'Validating...';
    if (isCommunityCoupon) return 'Auto-applied';
    if (couponDetails?.isValid) return 'Applied';
    if (couponError) return 'Invalid';
    return '';
  })();

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isCouponCodeValid) {
      applyCoupon();
    }
  };

  return {
    couponCode,
    setCouponCode,
    showCouponInput,
    setShowCouponInput,
    coupon,
    applyCoupon,
    removeCoupon,
    isCouponApplied,
    isCouponCodeValid,
    handleKeyPress,
    couponDetails,
    isLoadingCoupon,
    couponError,
    isCommunityCoupon,
    couponStatusText
  };
}
