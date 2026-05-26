import Link from "next/link";
import { ReactNode, MouseEvent, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "dark"
  | "yellow"
  | "ghost"
  | "ghost-dark"
  | "secondary"
  | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  external?: boolean;
  "data-flow"?: string;
}

interface ButtonElementProps
  extends BaseButtonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> {
  href?: undefined;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

interface AnchorElementProps
  extends BaseButtonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps> {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

type ButtonProps = ButtonElementProps | AnchorElementProps;

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  onClick,
  className = "",
  external = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-zjs-pill transition-all cursor-pointer hover:translate-y-[-1px] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zjs-blue";

  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-zjs-blue text-white hover:bg-zjs-blue-deep",
    dark: "bg-zjs-black text-white hover:bg-zjs-gray-800",
    yellow: "bg-zjs-yellow text-zjs-black hover:brightness-105",
    ghost: "bg-transparent text-zjs-blue border-[1.5px] border-zjs-blue hover:bg-zjs-blue-soft",
    "ghost-dark":
      "bg-transparent text-zjs-black border-[1.5px] border-zjs-black hover:bg-zjs-black hover:text-white",
    // Legacy aliases — map to new variants
    secondary: "bg-zjs-black text-white hover:bg-zjs-gray-800",
    outline:
      "bg-transparent text-zjs-black border-[1.5px] border-zjs-black hover:bg-zjs-black hover:text-white",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: "text-[var(--zjs-fs-xs)] px-3 py-1.5",
    md: "text-[var(--zjs-fs-sm)] px-5 py-3",
    lg: "text-base px-7 py-4",
  };

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    const {
      target: targetProp,
      rel: relProp,
      href: _ignoredHref,
      ...anchorRest
    } = props as AnchorElementProps;
    void _ignoredHref;
    const linkTarget = targetProp ?? (external ? "_blank" : undefined);
    const linkRel = relProp ?? (external ? "noopener noreferrer" : undefined);
    return (
      <Link
        href={href}
        className={buttonStyles}
        target={linkTarget}
        rel={linkRel}
        onClick={onClick as AnchorElementProps["onClick"]}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={buttonStyles}
      onClick={onClick as ButtonElementProps["onClick"]}
      {...(props as ButtonElementProps)}
    >
      {children}
    </button>
  );
}
