import {LucideIcon} from "lucide-react";
import React from "react";

export default function KitChip({
  variant,
  icon,
  iconSize = 16,
  children
}: {
  variant: 'orange' | 'blue' | 'green' | 'black';
  icon: LucideIcon | React.ReactNode;
  iconSize?: number;
  children: React.ReactNode;
}) {

  const variantClasses =
    variant === 'orange' ? 'bg-kit-orange'
      : variant === 'blue' ? 'bg-zurich'
        : variant === 'green' ? 'bg-kit-green'
            : 'bg-black';

  const iconClassesModifier = !!icon ? 'gap-1 py-1 px-2' : 'gap-0.5 py-0.5 px-1';

  const renderIcon = (() => {
    if (!icon) return null;
    // @ts-expect-error we know icon is a LucideIcon or custom ReactNode
    return React.createElement(icon, {size: iconSize});
  })() as React.ReactNode;

  return (
    <div className={`w-fit flex items-center rounded text-white ${variantClasses} ${iconClassesModifier}`}>
      {renderIcon}
      <span className="text-kit-xs font-medium leading-none">{children}</span>
    </div>
  )
}
