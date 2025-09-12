import {Loader, LucideIcon} from "lucide-react";
import React from 'react'

import KitComponent from "@/components/kit/utils/KitComponent";

export default function KitButton({
  tight = false,
  lucideIcon,
  customIcon,
  variant = 'white',
  children,
  className = '',
  as,
  busy = false,
  ...props
}: {
  tight?: boolean;
  lucideIcon?: LucideIcon;
  customIcon?: React.ReactNode;
  variant?: 'white' | 'black';
  children?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  busy?: boolean;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    if ((!!lucideIcon || !!customIcon) && !!children) {
      inner = innerForTightWithIconAndChildren;
    }
    else if (!children) {
      inner = innerForTightWithIcon;
    }
    else if (!lucideIcon && !customIcon) {
      inner = innerForTightWithChildren;
    }
  } else {
    if ((!!lucideIcon || !!customIcon) && !!children) {
      inner = innerWithIconAndChildren;
    }
    else {
      inner = innerWithChildren;
    }
  }

  outer += variant === 'white'
    ? ' bg-kit-gray-light text-black border-kit-gray-medium hover:bg-white hover:border-black focus:bg-white focus:border-black'
    : ' bg-black text-white border-black hover:bg-white hover:text-black hover:border-black hover:shadow-lg hover:shadow-white focus:bg-white focus:text-black focus:border-black';


  return (
    <KitComponent
      is={as ? as : 'button'}
      {...(as ? {} : { type: 'button' })}
      className={`rounded-[40px] h-fit min-w-max border-2 transition-all duration-300
      focus:outline-0 focus:ring-2 focus: ring-zurich ring-offset-2 select-none
      [&:disabled]:cursor-not-allowed [&:disabled]:opacity-80 ${outer} ${className} ${busy ? 'pointer-events-none' : ''}`}
      {...props}
      disabled={busy || props.disabled}
    >
      <span className={`text-kit-base relative leading-none font-medium ${inner}`}>
        {lucideIcon && <KitComponent is={lucideIcon} className="shrink-0" size={tight ? 32 : 16}/>}
        {customIcon && customIcon}
        {children}
        {busy &&
          <span className="absolute z-10 inset-0 backdrop-blur-[2px] rounded-full flex items-center justify-center">
            <Loader className="animate-[spin_2s_linear_infinite] text-zurich drop-shadow" size={24} />
          </span>
        }
      </span>
    </KitComponent>
  )
}
