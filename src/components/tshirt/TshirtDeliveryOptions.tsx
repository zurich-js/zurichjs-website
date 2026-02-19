import { Users, Truck, Clock, Banknote } from 'lucide-react';

import { PaymentMethod, DeliveryAddress, CashPaymentDetails } from './types';

interface TshirtDeliveryOptionsProps {
  delivery: boolean;
  setDelivery: (delivery: boolean) => void;
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<DeliveryAddress>>;
  cashPaymentDetails: CashPaymentDetails;
  setCashPaymentDetails: React.Dispatch<React.SetStateAction<CashPaymentDetails>>;
  isUserLoggedIn: boolean;
  isMounted: boolean;
}

export default function TshirtDeliveryOptions({
  delivery,
  setDelivery,
  paymentMethod,
  deliveryAddress,
  setDeliveryAddress,
  cashPaymentDetails,
  setCashPaymentDetails,
  isUserLoggedIn,
  isMounted
}: TshirtDeliveryOptionsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Delivery Method</h3>
        <p className="text-gray-600">How would you like to receive your ZurichJS t-shirt?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F1E271] transform hover:scale-105 ${!delivery
            ? 'bg-gradient-to-br from-[#F1E271] to-yellow-200 border-[#F1E271] shadow-xl scale-105'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          onClick={() => setDelivery(false)}
        >
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-800" />
            <h4 className="font-bold text-lg mb-2">Meetup Pickup</h4>
            <div className="text-2xl font-bold mb-2 text-green-700">FREE</div>
            <p className="text-sm text-gray-600">Join us at the next meetup - Meet fellow developers</p>
            <p className="text-xs text-gray-500 mt-2">
              {paymentMethod === 'cash'
                ? 'Perfect for cash payment!'
                : 'Available with online or cash payment'
              }
            </p>
          </div>
        </button>

        <button
          className={`p-6 rounded-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#F1E271] transform hover:scale-105 ${delivery
            ? 'bg-gradient-to-br from-[#F1E271] to-yellow-200 border-[#F1E271] shadow-xl scale-105'
            : paymentMethod === 'cash'
              ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
          onClick={() => {
            if (paymentMethod === 'cash') return;
            setDelivery(true);
          }}
          disabled={paymentMethod === 'cash'}
        >
          <div className="text-center">
            <Truck className="w-12 h-12 mx-auto mb-3 text-gray-800" />
            <h4 className="font-bold text-lg mb-2">Home Delivery</h4>
            <div className="text-2xl font-bold mb-2 text-gray-900">+CHF 10</div>
            <p className="text-sm text-gray-600">Switzerland only - 5-10 business days</p>
            <p className="text-xs text-gray-500 mt-1">Includes tracking & insurance</p>
            {paymentMethod === 'cash' && (
              <p className="text-xs text-red-600 mt-2">Not available with cash payment</p>
            )}
          </div>
        </button>
      </div>

      {/* Cash Payment Details Form */}
      {paymentMethod === 'cash' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-lg text-amber-900">Contact Details for Cash Payment</h4>
          </div>
          {/* Only show profile notice after client-side mount to avoid hydration mismatch */}
          {isMounted && isUserLoggedIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">
                Information taken from your account profile
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                value={cashPaymentDetails.firstName}
                onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={isMounted && isUserLoggedIn}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isMounted && isUserLoggedIn ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                  }`}
                placeholder="Your first name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                value={cashPaymentDetails.lastName}
                onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={isMounted && isUserLoggedIn}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isMounted && isUserLoggedIn ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                  }`}
                placeholder="Your last name"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input
                type="email"
                value={cashPaymentDetails.email}
                onChange={(e) => setCashPaymentDetails(prev => ({ ...prev, email: e.target.value }))}
                disabled={isMounted && isUserLoggedIn}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${isMounted && isUserLoggedIn ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                  }`}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              We&apos;ll use this information to contact you about pickup details at the next meetup.
            </p>
          </div>
        </div>
      )}

      {/* Delivery Address Form */}
      {delivery && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-lg text-gray-900 mb-4">Delivery Address</h4>
          {/* Only show profile notice after client-side mount to avoid hydration mismatch */}
          {isMounted && isUserLoggedIn && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">
                Name and email taken from your account profile
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={deliveryAddress.name}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, name: e.target.value }))}
                disabled={isMounted && isUserLoggedIn}
                required
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${isMounted && isUserLoggedIn ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                  }`}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={deliveryAddress.email}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, email: e.target.value }))}
                disabled={isMounted && isUserLoggedIn}
                required
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${isMounted && isUserLoggedIn ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                  }`}
                placeholder="your.email@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
              <input
                type="text"
                value={deliveryAddress.address}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, address: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                value={deliveryAddress.city}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
              <input
                type="text"
                value={deliveryAddress.zipCode}
                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="ZIP code"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {delivery
              ? 'Delivery within 5-10 business days to Swiss addresses (includes tracking & insurance)'
              : 'Available for pickup at our next meetup event'}
          </span>
        </div>
      </div>
    </div>
  );
}
