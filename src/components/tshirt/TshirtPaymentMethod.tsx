import { CreditCard, Banknote } from 'lucide-react';

import { PaymentMethod } from './types';

interface TshirtPaymentMethodProps {
  paymentMethod: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export default function TshirtPaymentMethod({
  paymentMethod,
  onSelect
}: TshirtPaymentMethodProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Payment Method</h3>
        <p className="text-gray-600">Select how you&apos;d like to pay for your ZurichJS t-shirt</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 transform hover:scale-105 ${paymentMethod === 'online'
            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-xl scale-105'
            : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
            }`}
          onClick={() => onSelect('online')}
        >
          <div className="text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <h4 className="font-bold text-lg mb-2">Pay Online</h4>
            <p className="text-sm text-gray-600">Card - TWINT - Instant - Home delivery available</p>
          </div>
        </button>

        <button
          className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transform hover:scale-105 ${paymentMethod === 'cash'
            ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-500 shadow-xl scale-105'
            : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-md'
            }`}
          onClick={() => onSelect('cash')}
        >
          <div className="text-center">
            <Banknote className="w-12 h-12 mx-auto mb-3 text-amber-600" />
            <h4 className="font-bold text-lg mb-2">Pay Cash</h4>
            <p className="text-sm text-gray-600">At meetup - Free pickup - Meet the community</p>
          </div>
        </button>
      </div>
    </div>
  );
}
