import React from "react";

import KitAccordion, {KitAccordionItem} from "@/components/v2/kit/KitAccordion";
import {makeSlug} from "@/components/v2/kit/utils/makeSlug";
import WorkshopSection from "@/components/v2/workshop/WorkshopSection";


export default function WorkshopSectionAccordion({
  slug,
  title,
  titleChildren,
  items,
}: {
  slug: string;
  title: string;
  titleChildren?: React.ReactNode;
  items: {
    title: string;
    content: string | React.ReactNode;
  }[]
}) {

  return (
    <WorkshopSection
      slug={slug}
      title={title}
      layout="section"
      titleChildren={titleChildren}
    >
      <KitAccordion>
        {items.map(({ title, content }) => (
          <KitAccordionItem key={makeSlug(title)} title={title}>
            {content}
          </KitAccordionItem>
        ))}
      </KitAccordion>
    </WorkshopSection>
  )
}
