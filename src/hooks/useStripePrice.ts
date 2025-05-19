import { useState, useEffect } from 'react';

interface StripePrice {
  id: string;
  unitAmount: number;
  currency: string;
  type: string;
}

export function useStripePrice(priceId: string | undefined) {
  const [price, setPrice] = useState<StripePrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!priceId) {
      setPrice(null);
      return;
    }

    const fetchPrice = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stripe/get-price?priceId=${priceId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch price');
        }
        
        const data = await response.json();
        setPrice(data);
      } catch (err) {
        console.error('Error fetching price:', err);
        setError((err as Error).message);
        setPrice(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [priceId]);

  return {
    price,
    isLoading,
    error,
  };
} 