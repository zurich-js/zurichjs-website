import React from "react";

import KitPageSection from "@/components/v2/kit/structure/KitPageSection";
import KitSectionContent from "@/components/v2/kit/structure/KitSectionContent";


export default function WorkshopSectionText({
  slug,
  children
}: {
  slug: string;
  children: React.ReactNode;
}) {

  return (
    <KitPageSection id={slug} layout="full">
      <KitSectionContent>
        {children}
      </KitSectionContent>
    </KitPageSection>
  )
}
