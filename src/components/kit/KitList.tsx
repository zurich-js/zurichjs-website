import { BadgeCheck, Check } from "lucide-react";
import React from 'react';

import KitComponent from "@/components/kit/utils/KitComponent";


export default function KitList({
  items,
  className = '',
  listItemClassName = '',
  listStyle = 'none',
  children = undefined
} : {
  items: React.ReactNode[] | undefined;
  className?: string;
  listItemClassName?: string;
  listStyle?: 'none' | 'badge-check' | 'numbered' | 'check' | 'disc';
  children?: React.ReactNode;
}) {

  const listStyles = (() => {
    if (listStyle === 'numbered') return 'list-inside list-decimal'
    if (listStyle === 'disc') return 'list-disc list-inside'
    return 'list-none'
  })()

  return (
    <KitComponent is={listStyle === 'numbered' ? 'ol' : 'ul'} className={`${className}`}>
      {children
        ? children
        : items?.map((item, index) => (
            <li key={index} className={`${listStyles} ${listItemClassName}`}>
              { listStyle === 'badge-check' && <BadgeCheck className="inline-block mr-2 mb-0.5 text-zurich" size={16} /> }
              { listStyle === 'check' && <Check className="inline-block mr-2 mb-0.5 text-zurich" size={16} /> }
              {item}
            </li>
        ))}
    </KitComponent>
  )
}
