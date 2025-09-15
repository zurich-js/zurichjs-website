import React from 'react';

export default function KitPill({
  children,
  color = 'green',
  className = ''
}: {
  children: React.ReactNode;
  color?: 'green' | 'orange';
  className?: string;
}) {

  const backgroundColor = color === 'green' ? 'bg-kit-green' : 'bg-kit-orange';

  return (
    <span className={`text-white leading-none text-kit-xs px-1 py-0.5 rounded-sm ${backgroundColor} ${className}`}>
      {children}
    </span>
  )
}
