import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

import { ValidationErrors } from '../types';

interface ErrorBannerProps {
  error: string;
  validationErrors: ValidationErrors;
  generateEmailBody: () => string;
  onEmailFallback: () => void;
}

export default function ErrorBanner({
  error,
  validationErrors,
  generateEmailBody,
  onEmailFallback,
}: ErrorBannerProps) {
  const errorCount = Object.values(validationErrors).filter(e => e !== undefined).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-red-800 font-semibold">
            {errorCount > 0
              ? `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} below`
              : 'Submission Error'}
          </h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>

      {errorCount === 0 && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2">Alternative: Email Your Submission</h4>
          <p className="text-red-700 text-sm mb-3">
            Don&apos;t worry! You can send your talk proposal directly to us via email. Click below to
            generate an email with your current form data.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`mailto:hello@zurichjs.com?body=${generateEmailBody()}`}
              className="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              onClick={onEmailFallback}
            >
              Send Email with Current Data
            </a>
            <a
              href="mailto:hello@zurichjs.com?subject=CFP%20Submission%20-%20Talk%20Proposal"
              className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium rounded-md transition-colors"
            >
              Send Blank Email
            </a>
          </div>
          <p className="text-xs text-red-600 mt-2">
            The first option will pre-fill an email with your current form data so you don&apos;t lose
            your work.
          </p>
        </div>
      )}
    </motion.div>
  );
}
