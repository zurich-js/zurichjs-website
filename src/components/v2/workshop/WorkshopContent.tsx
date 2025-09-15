import React from "react";

import KitPageContent from "@/components/v2/kit/structure/KitPageContent";
import {makeSlug} from "@/components/v2/kit/utils/makeSlug";

const workshopTOCTitles = {
  overview: "Overview",
  learn: "What you'll learn",
  faq: "Frequently Asked Questions",
  price: "Pricing and Registration",
  venue: "Venue Info",
  others: "Other Events"
}

const workshopTOC: Record<string, { title: string, slug: string }> = Object.fromEntries(
  Object.entries(workshopTOCTitles).map(([key, title]) => [key, { title, slug: makeSlug(title) }])
)

export default function WorkshopContent({
   children,
   className = '',
   toc = workshopTOC,
   includeTOC = true,
   title,
}: {
  children: React.ReactNode;
  className?: string;
  toc?: Record<string, { title: string, slug: string }>;
  includeTOC?: boolean;
  title: string;
}) {
  const tocEnabled = includeTOC && toc && Object.keys(toc).length > 0;

  return (
    <KitPageContent title={title} toc={toc} includeTOC={tocEnabled} className={className}>
      {children}
    </KitPageContent>
  )
}
