import {LucideIcon} from "lucide-react";
import React from "react";

import KitComponent from "@/components/kit/utils/KitComponent";

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

  return (
    <div className={`w-fit flex items-center rounded text-white ${variantClasses} ${iconClassesModifier}`}>
      {icon && <KitComponent is={icon} size={iconSize} />}
      <span className="text-kit-xs font-medium leading-none">{children}</span>
    </div>
  )
}
