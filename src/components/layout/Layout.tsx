import localFont from "next/font/local";

import AnnouncementBanner from '../AnnouncementBanner';

import Footer from './Footer';
import Header from './Header';

const figtree = localFont({
  src: [
    {
      path: '../../../public/Figtree-VariableFont_wght.ttf',
      style: 'normal',
    },
    {
      path: '../../../public/Figtree-Italic-VariableFont_wght.ttf',
      style: 'italic',
    }
  ],
})

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {

  return (
    <div className={`flex flex-col min-h-screen bg-white ${figtree.className}`}>
      <div className="sticky top-0 z-[60]">
        <AnnouncementBanner />
        <div className="relative bg-transparent">
          <Header />
        </div>
      </div>
      <main className="flex-grow pt-16 lg:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
