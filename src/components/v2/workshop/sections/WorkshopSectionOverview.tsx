import React from "react";

import KitPageSection from "@/components/v2/kit/structure/KitPageSection";
import KitSectionContent from "@/components/v2/kit/structure/KitSectionContent";


export default function WorkshopSectionOverview({
  children
}: {
  children: React.ReactNode;
}) {

  return (
    <KitPageSection id="overview" layout="full">
      <KitSectionContent>
        {children}
      </KitSectionContent>
    </KitPageSection>
  )
}
