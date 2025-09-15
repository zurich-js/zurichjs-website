import React from "react";

import KitPageSection from "@/components/v2/kit/structure/KitPageSection";
import KitSectionContent from "@/components/v2/kit/structure/KitSectionContent";
import KitSectionTitle from "@/components/v2/kit/structure/KitSectionTitle";


export default function WorkshopSection({
  slug,
  layout = "section",
  title,
  titleChildren,
  children
}: {
  slug: string;
  layout?: "section" | "full";
  title: string;
  titleChildren?: React.ReactNode;
  children: React.ReactNode;
}) {

  return (
    <KitPageSection id={slug} layout={layout}>
      <KitSectionTitle>
        {title}
        {titleChildren}
      </KitSectionTitle>
      <KitSectionContent>
        {children}
      </KitSectionContent>
    </KitPageSection>
  )
}
