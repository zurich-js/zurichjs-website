import { CheckCircle } from 'lucide-react';

import { PaymentMethod } from './types';

interface TshirtConfirmationProps {
  paymentMethod: PaymentMethod;
}

export default function TshirtConfirmation({ paymentMethod }: TshirtConfirmationProps) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed!</h3>
        <p className="text-gray-600 mb-6">
          {paymentMethod === 'cash'
            ? "Amazing! We'll see you at the next meetup. Can't wait to welcome you to the community!"
            : "Welcome to the family! Your shirt is on its way. We'll keep you updated every step of the journey."
          }
        </p>
      </div>
    </div>
  );
}
