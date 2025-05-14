import { Users } from 'lucide-react';
import React from 'react';

import Button from '@/components/ui/Button';

export default function AccountCreationIncentive() {
  return (
    <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
      <div className="flex items-start">
        <div className="bg-blue-100 rounded-full p-2 mr-4">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Join the ZurichJS Community
          </h3>
          <p className="text-gray-700 mb-4">
            Create an account to receive updates about upcoming events, access exclusive resources, and connect with other JavaScript enthusiasts.
          </p>
          <Button
            href="/signup"
            variant="secondary"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
} 