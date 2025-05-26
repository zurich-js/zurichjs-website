import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Gift, ArrowRight, Users, Calendar, TicketCheck } from 'lucide-react';

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
      transition={{ delay: 0.3 }}
      className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 mt-6 sm:mt-8 border border-purple-100 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex justify-center sm:justify-start">
          <div className="bg-purple-100 p-3 rounded-full">
            <Gift className="text-purple-600" size={24} />
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Join the ZurichJS Community
          </h3>
          <p className="text-gray-600 mb-4">
            Create an account and unlock exclusive benefits:
          </p>
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="bg-white bg-opacity-60 p-3 rounded-lg flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <TicketCheck className="text-purple-600 h-4 w-4" />
              </div>
              <span className="text-gray-700">
                Automatic community discount on future tickets
              </span>
            </div>
            <div className="bg-white bg-opacity-60 p-3 rounded-lg flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <Calendar className="text-purple-600 h-4 w-4" />
              </div>
              <span className="text-gray-700">
                Early access to workshop registrations
              </span>
            </div>
            <div className="bg-white bg-opacity-60 p-3 rounded-lg flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <Users className="text-purple-600 h-4 w-4" />
              </div>
              <span className="text-gray-700">
                Connect with other JavaScript developers
              </span>
            </div>
          </div>
          <div className="flex justify-center sm:justify-start">
            <Button
              href="/?signup=true"
              className="bg-purple-600 text-white hover:bg-purple-700 w-full sm:w-auto"
              size="lg"
            >
              Create Free Account
              <ArrowRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 