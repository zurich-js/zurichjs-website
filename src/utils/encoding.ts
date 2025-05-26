/**
 * Utilities for encoding and decoding URL data
 */

type PaymentData = {
  session_id?: string;
  workshop_id?: string;
  event_id?: string;
  ticket_type?: string;
  name?: string;
  email?: string;
  ticket?: string;
  price?: string;
  method?: string;
  type?: string;
  coupon?: string;
  // Add any other fields that need to be included
};

/**
 * Encodes payment data to base64
 */
export function encodePaymentData(data: PaymentData): string {
  try {
    const jsonString = JSON.stringify(data);
    if (typeof window !== 'undefined') {
      // Browser environment
      return btoa(jsonString);
    } else {
      // Node.js environment
      return Buffer.from(jsonString).toString('base64');
    }
  } catch (error) {
    console.error('Error encoding payment data:', error);
    return '';
  }
}

/**
 * Decodes base64 encoded payment data
 */
export function decodePaymentData(encodedData: string): PaymentData {
  try {
    let jsonString: string;
    
    if (typeof window !== 'undefined') {
      // Browser environment
      jsonString = atob(encodedData);
    } else {
      // Node.js environment
      jsonString = Buffer.from(encodedData, 'base64').toString();
    }
    
    return JSON.parse(jsonString) as PaymentData;
  } catch (error) {
    console.error('Error decoding payment data:', error);
    return {};
  }
} 