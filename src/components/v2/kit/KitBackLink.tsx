import { ArrowLeft } from 'lucide-react';
import Link from "next/link";
import React from "react";

export default function KitBackLink({
  href,
  children,
  className = ''
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) {

  return (
    <Link
      href={href}
      className={`w-fit flex  items-center gap-1 text-kit-base leading-none font-normal text-gray-500 group hover:text-black transition-colors duration-300 ${className}`}
    >
      <ArrowLeft size={16} className="group-hover:-translate-x-1/3 transition-all duration-300" />
      {children}
    </Link>
  )
}
