import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Gift, ArrowRight } from 'lucide-react';

import Button from '@/components/ui/Button';

export default function AccountCreationIncentive() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mt-8 border border-purple-100"
    >
      <div className="flex items-start gap-4">
        <div className="bg-purple-100 p-3 rounded-full">
          <Gift className="text-purple-600" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Create a ZurichJS Account
          </h3>
          <p className="text-gray-600 mb-4">
            Join our community to get exclusive benefits:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center text-gray-700">
              <span className="text-purple-500 mr-2">•</span>
              Automatic community discount on future tickets
            </li>
            <li className="flex items-center text-gray-700">
              <span className="text-purple-500 mr-2">•</span>
              Early access to workshop registrations
            </li>
            <li className="flex items-center text-gray-700">
              <span className="text-purple-500 mr-2">•</span>
              Connect with other JavaScript developers
            </li>
          </ul>
          <Button
            href="/?signup=true"
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Create Account
            <ArrowRight className="ml-2" size={16} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
} 