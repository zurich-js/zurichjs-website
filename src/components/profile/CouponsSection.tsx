import { useUser } from '@clerk/nextjs';
import { Tag, Check, ArrowRight, Loader2 } from 'lucide-react';

import Button from '@/components/ui/Button';

interface Coupon {
  code: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

export default function CouponsSection() {
  const { user, isLoaded } = useUser();
  const allCoupons = user?.unsafeMetadata?.coupons as Coupon[] | undefined;
  const activeCoupons = allCoupons?.filter(coupon => coupon.isActive);

  if (!isLoaded) {
    return (
      <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8 mb-12">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </div>
    );
  }

  if (!activeCoupons || activeCoupons.length === 0) {
    return null;
  }

  return (
    <div className="bg-white bg-opacity-95 rounded-xl shadow-lg p-6 sm:p-8 mb-12">
      <div className="flex items-center mb-6">
        <div className="bg-green-100 p-2 rounded-full">
          <Tag size={24} className="text-green-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 ml-3">Your ZurichJS Community Coupons</h2>
      </div>

      <div className="space-y-4">
        <p className="text-gray-700 mb-6">
          Thank you for being part of our community! Here are your active ZurichJS coupons that you can use for our events and workshops.
        </p>

        <div className="grid gap-4">
          {activeCoupons.map((coupon) => (
            <div 
              key={coupon.code}
              className="p-4 rounded-lg border bg-green-50 border-green-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-mono text-lg font-bold">{coupon.code}</p>
                    <p className="text-sm text-gray-500">
                      Assigned on {new Date(coupon.assignedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button
            href="/workshops"
            variant="primary"
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 focus:ring-blue-400"
          >
            Use Your Coupon
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 