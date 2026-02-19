export type SizeQuantity = {
  [size: string]: number;
};

export type DeliveryAddress = {
  name: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
};

export type CashPaymentDetails = {
  firstName: string;
  lastName: string;
  email: string;
};

export type PaymentMethod = 'online' | 'cash';

export interface TshirtContextType {
  // Stock
  stock: Record<string, number>;
  stockLoading: boolean;
  stockError: boolean;

  // Size selection
  sizeQuantities: SizeQuantity;
  setSizeQuantities: React.Dispatch<React.SetStateAction<SizeQuantity>>;
  totalQuantity: number;

  // Delivery
  delivery: boolean;
  setDelivery: React.Dispatch<React.SetStateAction<boolean>>;
  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<DeliveryAddress>>;

  // Payment
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  cashPaymentDetails: CashPaymentDetails;
  setCashPaymentDetails: React.Dispatch<React.SetStateAction<CashPaymentDetails>>;

  // Step navigation
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  handleNextStep: () => void;
  handlePrevStep: () => void;

  // Pricing
  tshirtTotal: number;
  discountedTotal: number;
  discountLabel: string;
  hasCoupon: boolean;
  communityDiscount: boolean;

  // User
  isSignedIn: boolean;
  userEmail: string | null | undefined;
  userLoaded: boolean;
  user: unknown;

  // Loading/error
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  checkoutError: string;
  setCheckoutError: React.Dispatch<React.SetStateAction<string>>;

  // Payment method selection handler
  handlePaymentMethodSelect: (method: PaymentMethod) => void;

  // Validation
  isStepValid: (stepNum: number) => boolean;
}

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const BASE_PRICE = 25;
export const DELIVERY_ADDON = 10;
