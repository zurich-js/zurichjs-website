import React from "react";
import {makeSlug} from "@/components/kit/utils/makeSlug";

export default function KitPageContent({
  children,
  className = '',
  toc,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  toc?: Record<string, { title: string, slug: string }>;
  title: string;
}) {
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  const titleSlug = makeSlug(title);

  // useEffect to set up IntersectionObserver for sections in the toc
  // we only want the first section to be active when multiple are in view
  React.useEffect(() => {
    if (!toc) return;

    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        const firstVisibleEntry = visibleEntries.reduce((prev, current) => {
          return (prev.boundingClientRect.top < current.boundingClientRect.top) ? prev : current;
        });
        setActiveSection(firstVisibleEntry.target.id);
      }
    }, { rootMargin: '-56px 0px -80% 0px', threshold: 0.1 });

    // Observe each section in the toc
    Object.values(toc).forEach(item => {
      const element = document.getElementById(item.slug);
      if (element) {
        observer.observe(element);
      }
    });

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, [toc]);

  React.useEffect(() => {
      if (activeSection) {
      history.replaceState(null, '', `#${activeSection}`);
      } else {
      history.replaceState(null, '', `#${titleSlug}`);
      }
  }, [activeSection, titleSlug]);

  return (
    <div className={`bg-white container mx-auto px-6 max-w-[1440px] py-10 flex justify-between ${className}`}>
      <div className={`w-full flex flex-col gap-20 flex-1 ${toc ? 'max-w-[920px]' : ''}`}>
        {children}
      </div>
      {toc && Object.keys(toc)?.length && (
        <ul className="basis-[200px] shrink-0 grow-0 sticky top-[68px] h-fit flex flex-col gap-1">
          {Object.values(toc).map((item, index) => (
            <li
              key={item.slug}
              className={`px-2 border-l-4 border-transparent hover:border-zurich ${activeSection === item.slug ? 'border-zurich' : ''}`}
            >
              <a
                href={`#${index === 0 ? titleSlug : item.slug}`}
                className={`block ${index === 0 && 'font-bold'}`}
              >
                {index === 0 ? title : item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
