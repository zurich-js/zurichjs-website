import { Shirt } from 'lucide-react';

import { BASE_PRICE, SIZES, SizeQuantity } from './types';

interface TshirtProductConfigProps {
  stock: Record<string, number>;
  stockLoading: boolean;
  stockError: boolean;
  sizeQuantities: SizeQuantity;
  setSizeQuantities: React.Dispatch<React.SetStateAction<SizeQuantity>>;
  totalQuantity: number;
}

export default function TshirtProductConfig({
  stock,
  stockLoading,
  stockError,
  sizeQuantities,
  setSizeQuantities,
  totalQuantity
}: TshirtProductConfigProps) {
  return (
    <div className="space-y-6">
      {/* Size & Quantity Selection */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
            <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-js" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg sm:text-xl text-gray-900">Choose Your Fit</h3>
            <p className="text-xs sm:text-sm text-gray-600">Unisex comfort for everyone - Perfect for meetups - Max 10 items total</p>
          </div>
        </div>

        {stockLoading ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span className="text-sm">Checking stock availability...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {SIZES.map((sz) => {
              const stockCount = stock[sz] || 0;
              const currentQty = sizeQuantities[sz] || 0;
              const isLowStock = stockCount <= 5 && stockCount > 0 && !stockError;
              const isOutOfStock = stockCount === 0 && !stockError;
              const isStockUnknown = stockError;

              return (
                <div key={sz} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${currentQty > 0
                  ? 'bg-js/10 border-js shadow-md'
                  : isOutOfStock && !isStockUnknown
                    ? 'bg-gray-50 border-gray-200 opacity-75'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${currentQty > 0
                      ? 'bg-black text-js'
                      : isOutOfStock && !isStockUnknown
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                      {sz}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Size {sz}</div>
                      <div className="text-sm text-gray-600">
                        {!isStockUnknown && stockCount > 0 && (
                          <span className={isLowStock ? 'text-orange-600' : 'text-green-600'}>
                            {stockCount} in stock
                          </span>
                        )}
                        {!isStockUnknown && isOutOfStock && (
                          <span className="text-red-600">Sold out</span>
                        )}
                        {isStockUnknown && (
                          <span className="text-yellow-600">Stock unknown</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className="w-8 h-8 rounded-lg border border-gray-300 bg-white font-bold text-lg hover:border-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-black"
                      onClick={() => setSizeQuantities(prev => ({ ...prev, [sz]: Math.max(0, (prev[sz] || 0) - 1) }))}
                      disabled={currentQty <= 0 || (isOutOfStock && !isStockUnknown)}
                      aria-label={`Decrease quantity for size ${sz}`}
                    >
                      -
                    </button>

                    <div className="bg-gray-100 px-3 py-1 rounded-lg min-w-[3rem] text-center font-bold">
                      {currentQty}
                    </div>

                    <button
                      className="w-8 h-8 rounded-lg border border-gray-300 bg-white font-bold text-lg hover:border-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-black"
                      onClick={() => setSizeQuantities(prev => ({ ...prev, [sz]: Math.min(stockCount, totalQuantity < 10 ? (prev[sz] || 0) + 1 : (prev[sz] || 0)) }))}
                      disabled={(isOutOfStock && !isStockUnknown) || currentQty >= stockCount || totalQuantity >= 10}
                      aria-label={`Increase quantity for size ${sz}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">Total Items:</span>
                <span className="font-bold text-lg">{totalQuantity}</span>
              </div>
              {Object.entries(sizeQuantities)
                .filter(([, qty]) => qty > 0)
                .map(([size, qty]) => (
                  <div key={size} className="flex justify-between items-center text-sm text-gray-600">
                    <span>Size {size}:</span>
                    <span>{qty} x CHF {BASE_PRICE} = CHF {qty * BASE_PRICE}</span>
                  </div>
                ))
              }
            </div>

            {!stockLoading && stockError && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                Unable to check stock at the moment. Please reach out to support at hello@zurichjs.com for assistance.
              </div>
            )}

            {totalQuantity === 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                Select quantities for the sizes you want to add them to your cart.
              </div>
            )}

            {totalQuantity >= 10 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                Maximum 10 items per order reached.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
