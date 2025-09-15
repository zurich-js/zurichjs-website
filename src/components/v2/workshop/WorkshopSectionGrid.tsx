import {LucideIcon} from "lucide-react";
import React from "react";

import KitGrid, {KitGridItem} from "@/components/v2/kit/KitGrid";
import WorkshopSection from "@/components/v2/workshop/WorkshopSection";


export default function WorkshopSectionGrid({
  slug,
  title,
  titleChildren,
  gridItems,
}: {
  slug: string;
  title: string;
  titleChildren?: React.ReactNode;
  gridItems: {
    icon: LucideIcon;
    title: string;
    description: string | React.ReactNode;
  }[]
}) {

  return (
    <WorkshopSection
      slug={slug}
      title={title}
      layout="section"
      titleChildren={titleChildren}
    >
      <KitGrid>
        {gridItems.map((item, index) => (
          <KitGridItem key={index} icon={item.icon} title={item.title}>
            {item.description}
          </KitGridItem>
        ))}
      </KitGrid>
    </WorkshopSection>
  )
}
