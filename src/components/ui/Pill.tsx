import type { ReactNode } from "react";

type PillVariant = "yellow" | "blue" | "green" | "dark" | "soft-yellow" | "purple" | "gray";

interface PillProps {
  children: ReactNode;
  variant?: PillVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<PillVariant, string> = {
  yellow: "bg-zjs-yellow text-zjs-black",
  blue: "bg-zjs-blue-soft text-zjs-blue-deep",
  green: "bg-[#D1FAE5] text-[#047857]",
  dark: "bg-zjs-black text-white",
  "soft-yellow": "bg-zjs-yellow-mute text-[#854D0E]",
  purple: "bg-[#EDE9FE] text-[#6D28D9]",
  gray: "bg-zjs-gray-100 text-zjs-gray-700",
};

export default function Pill({
  children,
  variant = "yellow",
  size = "sm",
  className = "",
}: PillProps) {
  const sizeStyles = size === "md" ? "px-3.5 py-2 text-[13px]" : "px-2.5 py-1 text-[12px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-zjs-pill font-semibold tracking-[0.01em] ${variantStyles[variant]} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
}
