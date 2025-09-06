import { BadgeCheck, Check } from "lucide-react";
import React from 'react';

import KitComponent from "@/components/kit/utils/KitComponent";


export default function KitList({
  items,
  className = '',
  listStyle = 'none',
  children = undefined
} : {
  items: React.ReactNode[];
  className?: string;
  listStyle?: 'none' | 'badge-check' | 'numbered' | 'check'
  children?: React.ReactNode;
}) {

  return (
    <KitComponent is={listStyle === 'numbered' ? 'ol' : 'ul'} className={`${className}`}>
      {children
        ? children
        : items.map((item, index) => (
            <li key={index} className={`${listStyle === 'numbered' ? 'list-inside list-decimal' : 'list-none'}`}>
              { listStyle === 'badge-check' && <BadgeCheck className="inline-block mr-2 mb-0.5 text-zurich" size={16} /> }
              { listStyle === 'check' && <Check className="inline-block mr-2 mb-0.5 text-zurich" size={16} /> }
              {item}
            </li>
        ))}
    </KitComponent>
  )
}
