import {LucideIcon} from "lucide-react";
import React from "react";

import KitComponent from "@/components/kit/utils/KitComponent";

export function KitGridItem({
  icon,
  title,
  children,
}: {
  icon: LucideIcon | React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {

  return (
    <div className="flex flex-col p-2">
      <div className="flex items-center">
        <div className="p-2">
          <KitComponent is={icon} size={48} strokeWidth={1} />
        </div>
        <h3 className="text-kit-base font-medium">{title}</h3>
      </div>
      <p className="text-kit-sm p-1 pb-2">{children}</p>
    </div>
  )
}

export default function KitGrid({
  items,
  className = '',
  children
}:{
  items?: React.ReactNode[];
  className?: string;
  children?: React.ReactNode;
}) {

  return (
    <ul className={`w-full list-none m-0 p-0 grid grid-cols-[repeat(2,minmax(300px,1fr))] gap-4 ${className}`}>
      {children ? children : items?.map((item, index) => (
          <li key={index} className="p-2">
            {item}
          </li>
        ))}
    </ul>
  )
}
