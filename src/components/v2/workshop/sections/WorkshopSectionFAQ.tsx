import React from "react";

import WorkshopSectionAccordion from "@/components/v2/workshop/WorkshopSectionAccordion";

export default function WorkshopSectionFAQ({
  items
}: {
  items: {
    title: string;
    content: string | React.ReactNode;
  }[]
}) {

  return (
    <WorkshopSectionAccordion
      slug="frequently-asked-questions"
      title="Frequently Asked Questions"
      items={items}
    />
  )
}
