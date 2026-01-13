import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import Button from '@/components/ui/Button';

export default function SuccessState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-lg text-center"
    >
      <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
      <h3 className="text-2xl font-bold mb-2">Thank You for Your Submission!</h3>
      <p className="mb-6">
        We&apos;ve received your talk proposal and will review it shortly. Our team will contact you
        within the next 2 weeks regarding the status of your submission.
      </p>
      <Button href="/" variant="secondary">
        Return to Homepage
      </Button>
    </motion.div>
  );
}
