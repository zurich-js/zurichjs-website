import { Dialog, DialogPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

type KitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const KitModal = ({
  isOpen,
  onClose,
  children,
  size = 'md',
}: KitModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          as="div"
          className="relative z-50"
          onClose={onClose}
        >
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-30"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.3, ease: 'easeOut' },
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2, ease: 'easeIn' },
            }}
          />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <DialogPanel
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.3, ease: 'easeOut' },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.2, ease: 'easeIn' },
                }}
                className={`w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl ${sizeClasses[size]}`}
              >
                {children}
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
