import React from "react";

import KitButton from "@/components/kit/button/KitButton";

export function SBBButton({ link }: { link: string}) {
  return (
    <KitButton
      customIcon={(
        <div className="relative z-20 bg-[#EC0001] rounded-full flex items-center justify-center h-full aspect-square p-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="14" viewBox="0 0 24 14" fill="none">
            <path d="M6 13.0132H9.4875L4.8 8.39056H10.6125V13.0132H13.3875V8.39056H19.2375L14.5125 13.0132H18L24 7L18.0375 0.986755H14.55L19.2375 5.60944H13.3875V0.986755H10.6125V5.60944H4.8L9.4875 0.986755H6L0 7L6 13.0132Z" fill="white"/>
          </svg>
        </div>
      )}
      tight={true}
      variant="custom"
      as={'a' as React.ElementType}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden bg-black text-white border-black hover:border-black hover:shadow-lg hover:shadow-white focus:border-black"
    >
      <div className="absolute inset-0 -translate-x-3 bg-[#EC0001] rounded-full scale-0 group-hover:scale-[200%] group-focus:scale-[200%] transition-transform duration-500 ease-in-out origin-left pointer-events-none z-0" />

      {/* Content */}
      <span className="relative z-20">Getting there from Zurich HB</span>
    </KitButton>
  )
}
