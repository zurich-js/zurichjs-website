import {motion, MotionProps} from "framer-motion";
import { Info, CircleAlert, TriangleAlert } from 'lucide-react';
import React from 'react';

export default function Callout({
  children,
  type = 'note',
  className = '',
  motionProps = {},
  textClassName
}: {
  children: React.ReactNode;
  type?: 'note' | 'warning' | 'danger' | 'stripped';
  className?: string
  motionProps?: MotionProps;
  textClassName?: string;
}) {

  const typeClasses = {
    note: 'bg-blue-50 border-blue-400 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-700',
    danger: 'bg-red-50 border-red-400 text-red-700',
    stripped: 'bg-transparent border-transparent text-gray-700',
  }
  const calloutIcon = {
    note: <Info className="inline-block mr-1 text-current" size={16} />,
    warning: <TriangleAlert className="inline-block mr-1 text-current" size={16} />,
    danger: <CircleAlert className="inline-block mr-1 text-current" size={16} />,
    stripped: undefined, // No icon for stripped type
  }

  return (
  <motion.div
    className={`${typeClasses[type]} ${className}`}
    {...motionProps}
  >
    <motion.p
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className={`${textClassName ?? ''} text-sm`}
    >
      {calloutIcon[type]}
      <span>{children}</span>
    </motion.p>
  </motion.div>
  );

}
