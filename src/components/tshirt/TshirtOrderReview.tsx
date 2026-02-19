import { BASE_PRICE, PaymentMethod, SizeQuantity } from './types';

interface TshirtOrderReviewProps {
  sizeQuantities: SizeQuantity;
  totalQuantity: number;
  paymentMethod: PaymentMethod;
  delivery: boolean;
  discountedTotal: number;
  discountLabel: string;
  hasCoupon: boolean | null;
  communityDiscount: boolean;
  checkoutError: string;
}

export default function TshirtOrderReview({
  sizeQuantities,
  totalQuantity,
  paymentMethod,
  delivery,
  discountedTotal,
  discountLabel,
  hasCoupon,
  communityDiscount,
  checkoutError
}: TshirtOrderReviewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Review Your Order</h3>
        <p className="text-gray-600">Please review your order details before completing your purchase</p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Product:</span>
            <span>ZurichJS T-Shirt</span>
          </div>
          {Object.entries(sizeQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([size, qty]) => (
              <div key={size} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Size {size}:</span>
                <span>{qty} x CHF {BASE_PRICE} = CHF {qty * BASE_PRICE}</span>
              </div>
            ))
          }
          <div className="flex justify-between items-center font-semibold pt-2 border-t">
            <span>Total Items:</span>
            <span>{totalQuantity}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Payment Method:</span>
          <span>{paymentMethod === 'cash' ? 'Cash at Meetup' : 'Online Payment'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium">Delivery:</span>
          <span>{delivery ? 'Home Delivery (+CHF 10)' : 'Meetup Pickup (Free)'}</span>
        </div>
        {(communityDiscount || hasCoupon) && (
          <div className="flex justify-between items-center text-green-700">
            <span className="font-medium">Discount:</span>
            <span>-{discountLabel}</span>
          </div>
        )}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total:</span>
            <span>CHF {discountedTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {checkoutError}
        </div>
      )}
    </div>
  );
}
