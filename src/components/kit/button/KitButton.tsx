import {LucideIcon} from "lucide-react";
import React from 'react'

export default function KitButton({
  tight = false,
  icon,
  iconCustom = false,
  variant = 'white',
  children,
  className = ''
}: {
  tight?: boolean;
  icon?: React.ReactNode | LucideIcon;
  iconCustom?: React.ReactNode;
  variant?: 'white' | 'black';
  children?: React.ReactNode;
  className?: string;
}) {

  const outerForTight = 'p-1 flex items-center w-fit';
  const innerForTightWithIconAndChildren = 'block pr-3 gap-3 flex items-center min-h-[32px]';
  const innerForTightWithIcon = 'block';
  const innerForTightWithChildren = 'block px-3 gap-3 flex items-center min-h-[32px]';
  const innerWithIconAndChildren = 'p-3 flex gap-2 items-center';
  const innerWithChildren = 'block p-3';

  let outer = '';
  let inner = '';
  if (tight) {
    outer = outerForTight;
    if (!!icon && !!children) {
      inner = innerForTightWithIconAndChildren;
    }
    else if (!children) {
      inner = innerForTightWithIcon;
    }
    else if (!icon) {
      inner = innerForTightWithChildren;
    }
  } else {
    if (!!icon && !!children) {
      inner = innerWithIconAndChildren;
    }
    else {
      inner = innerWithChildren;
    }
  }

  outer += variant === 'white'
    ? ' bg-kit-gray-light text-black border-kit-gray-medium hover:bg-white hover:border-black focus:bg-white focus:border-black'
    : ' bg-black text-white border-black hover:bg-white hover:text-black hover:border-black hover:shadow-lg hover:shadow-white hover:-translate-y-px hover:-translate-x-px focus:bg-white focus:text-black focus:border-black';

  const renderIcon = (() => {
    if (!icon) return null;
    if (iconCustom) return icon;
    // @ts-expect-error we know icon is a LucideIcon or custom ReactNode
    return React.createElement(icon, {size: tight ? 32 : 16});
  })() as React.ReactNode;

  return (
    <button
      type="button"
      className={`rounded-[40px] h-fit border-2 transition-all duration-300 focus:outline-0 focus:ring-2 focus: ring-zurich ring-offset-2 ${outer} ${className}`}
    >
      <span className={`text-kit-base leading-none font-medium ${inner}`}>
        { renderIcon }
        {children}
      </span>
    </button>
  )
}
