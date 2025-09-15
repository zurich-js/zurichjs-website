import React from "react";

export default function KitLinkButton({ onClick, children, className }: { onClick: () => void; children: React.ReactNode, className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-kit-sm text-zurich block underline hover:opacity-70 w-fit ${className}`}
    >
      {children}
    </button>
  )
}
