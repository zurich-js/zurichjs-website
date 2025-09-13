import { Disclosure, DisclosureButton } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import React from 'react';

export function KitAccordionItem({
    title,
    content,
    className = '',
    children
}: {
    title: string;
    content?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}) {
  return (
    <li className={`border-b border-gray-500 first:border-t ${className}`} key={title.replace(/\s+/g, '-').toLowerCase()}>
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="w-full cursor-pointer list-none outline-none text-kit-base font-medium py-4 px-1 flex items-center hover:bg-gray-50 transition-colors duration-200">
              {title}
              <motion.div
                animate={{ rotate: open ? -90 : 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="ml-auto"
              >
                <ChevronRight className="stroke-1" size={24} />
              </motion.div>
            </DisclosureButton>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    opacity: { duration: 0.2 }
                  }}
                  className="overflow-hidden"
                >
                  <div className="text-kit-sm text-gray-500 pb-2 px-1">
                    {children ? children : content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </Disclosure>
    </li>
  )
}

export default function KitAccordion({
    items,
    className = '',
  children
} : {
    items?: { title: string; content: React.ReactNode }[];
    className?: string;
    children?: React.ReactNode;
}) {

  return (
    <ul className={`flex flex-col m-0 p-0 list-none ${className}`}>
      {children ? children : items?.map(({title, content}) => (
          <KitAccordionItem key={title.replace(/\s+/g, '-').toLowerCase()} title={title} content={content} />
        ))
      }
    </ul>
  )
}
