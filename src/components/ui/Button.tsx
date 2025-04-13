import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode, MouseEvent, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

// Define our variant and size types
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// Props that are common to both button and link
interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  external?: boolean;
}

// Props specific to button element
interface ButtonElementProps extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> {
  href?: undefined;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Props specific to anchor element
interface AnchorElementProps extends BaseButtonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

// Combined props type - component will accept either button or anchor props
type ButtonProps = ButtonElementProps | AnchorElementProps;

export default function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  external = false,
  ...props
}: ButtonProps) {
  // Define button styles based on variant and size
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-black text-white hover:bg-gray-800 focus:ring-black',
    secondary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    outline: 'bg-transparent border-2 border-current text-black hover:bg-black hover:text-white focus:ring-black',
    ghost: 'bg-transparent text-black hover:bg-yellow-100 focus:ring-black',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const buttonContent = (
    <motion.span
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-full flex items-center justify-center"
    >
      {children}
    </motion.span>
  );

  // Return link or button based on href prop
  if (href) {
    return (
      <Link
        href={href}
        className={buttonStyles}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button className={buttonStyles} onClick={onClick as ButtonElementProps['onClick']} {...props as ButtonElementProps}>
      {buttonContent}
    </button>
  );
}
