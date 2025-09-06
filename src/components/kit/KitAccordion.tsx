import { ChevronRight } from 'lucide-react';
import React from 'react';

export function KitAccordionItem({
    title,
    content,
    className = '',
    children
}: {
    title: string;
    content?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}) {
  return (
    <li className={`[&>details]:border-b border-b-gray-500 [&:first-of-type>details]:border-t ${className}`} key={title.replace(/\s+/g, '-').toLowerCase()}>
      <details className="w-full [&_.chevron]:rotate-0 [&[open]_.chevron]:-rotate-90 cursor-pointer">
        <summary className="cursor-pointer list-none outline-none text-kit-base font-medium py-4 px-1 flex items-center">
          {title}
          <ChevronRight className="ml-auto chevron transition-transform duration-300 stroke-1" size={24} />
        </summary>
        <div className="text-kit-sm text-gray-500 -mt-2 pb-2 px-1">
          {children ? children : content}
        </div>
      </details>
    </li>
  )
}

export default function KitAccordion({
    items,
    className = '',
  children
} : {
    items?: { title: string; content: React.ReactNode }[];
    className?: string;
    children?: React.ReactNode;
}) {

  return (
    <ul className={`flex flex-col m-0 p-0 list-none ${className}`}>
      {children ? children : items?.map(({title, content}) => (
          <KitAccordionItem key={title.replace(/\s+/g, '-').toLowerCase()} title={title} content={content} />
        ))
      }
    </ul>
  )
}
