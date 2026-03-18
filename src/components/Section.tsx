import type { ReactNode } from 'react';

type SectionVariant = 'gradient' | 'js' | 'js-dark' | 'zurich' | 'black' | 'white' | 'gray' | 'transparent';
type SectionPadding = 'sm' | 'md' | 'lg' | 'none';

interface SectionProps {
  children: ReactNode;
  variant?: SectionVariant;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
  padding?: SectionPadding;
  id?: string;
}

const variantStyles: Record<SectionVariant, string> = {
  'gradient': 'bg-gradient-to-br from-js to-js-dark',
  'js': 'bg-js',
  'js-dark': 'bg-js-dark',
  'zurich': 'bg-zurich',
  'black': 'bg-black text-white',
  'white': 'bg-white',
  'gray': 'bg-gray-50',
  'transparent': 'bg-transparent'
};

const paddingStyles: Record<SectionPadding, string> = {
  'none': '',
  'sm': 'py-4 lg:py-8',
  'md': 'py-4 lg:py-16',
  'lg': 'py-4 lg:py-24'
};

export default function Section({
  children,
  variant = 'white',
  className = '',
  containerClassName = '',
  padding = 'md',
  id = ''
}: SectionProps) {
  return (
    <section
      id={id}
      className={`w-full ${variantStyles[variant]} ${paddingStyles[padding]} ${className} animate-fade-in`}
    >
      <div className={`container mx-auto px-6 ${containerClassName}`}>
        {children}
      </div>
    </section>
  );
}
