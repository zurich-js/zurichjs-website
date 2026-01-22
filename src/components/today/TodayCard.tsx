import { ReactNode } from 'react';

interface TodayCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function TodayCard({ children, className = '', noPadding = false }: TodayCardProps) {
  return (
    <div className={`bg-white rounded-3xl ${noPadding ? '' : 'p-6 sm:p-5'} ${className}`}>
      {children}
    </div>
  );
}