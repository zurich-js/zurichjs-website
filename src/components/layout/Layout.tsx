import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }: { children: React.ReactNode }) {


  return (
    <div className="flex flex-col min-h-screen bg-yellow-400">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
