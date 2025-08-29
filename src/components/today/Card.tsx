import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div className={`bg-white rounded-3xl shadow-lg border border-gray-100 ${noPadding ? '' : 'p-5'} ${className}`}>
      {children}
    </div>
  );
}