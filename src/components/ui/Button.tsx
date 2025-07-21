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
  // Basic button styles with mobile-first design
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md cursor-pointer transition-all duration-200 touch-manipulation active:scale-95';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg',
    secondary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg',
    outline: 'bg-transparent border-2 border-current text-black hover:bg-black hover:text-white shadow-sm hover:shadow-md',
    ghost: 'bg-transparent text-black hover:bg-yellow-100 hover:shadow-sm',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-sm px-3 py-2 min-h-[40px]',
    md: 'text-sm sm:text-base px-4 py-2.5 min-h-[44px]',
    lg: 'text-base sm:text-lg px-6 py-3 min-h-[48px]',
  };

  // Compose the final className
  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  // If href is present, render a link
  if (href) {
    // External link: use <a> directly
    if (external) {
      return (
        <a
          href={href}
          className={buttonStyles}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick as AnchorElementProps['onClick']}
          {...(props as Omit<AnchorElementProps, 'href'>)}
        >
          {children}
        </a>
      );
    }
    
    // Internal link: use Link directly (it renders as <a> automatically)
    return (
      <Link
        href={href}
        style={{ cursor: 'pointer' }}
        className={buttonStyles}
        onClick={onClick as AnchorElementProps['onClick']}
        {...(props as Omit<AnchorElementProps, 'href'>)}
      >
        {children}
      </Link>
    );
  }

  // Regular button
  return (
    <button
      type="button"
      className={buttonStyles}
      onClick={onClick as ButtonElementProps['onClick']}
      {...props as ButtonElementProps}
    >
      {children}
    </button>
  );
}
