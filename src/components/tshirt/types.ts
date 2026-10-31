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

export type PaymentMethod = "online" | "cash";

export const SIZES = ["S", "M", "L", "XL", "XXL"];
export const BASE_PRICE = 25;
export const DELIVERY_ADDON = 10;
