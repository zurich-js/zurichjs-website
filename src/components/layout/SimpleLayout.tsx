import { ReactNode } from 'react';

interface SimpleLayoutProps {
  children: ReactNode;
}

export default function SimpleLayout({ children }: SimpleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <header className="bg-blue-600 text-white p-4 text-center text-2xl font-bold">
        ZurichJS Gallery
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Simple footer */}
      <footer className="bg-gray-100 p-4 text-center text-gray-600">
        © 2024 ZurichJS Community
      </footer>
    </div>
  );
}