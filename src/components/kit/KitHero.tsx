import React from 'react';

import KitTruncatedTextWithAnchor from "@/components/kit/KitTruncatedTextWithAnchor";
import {makeSlug} from "@/components/kit/utils/makeSlug";
import Section from "@/components/Section";

interface KitHeroProps {
  slots?: {
    top?: React.ReactNode;
    details?: React.ReactNode;
    actions?: React.ReactNode;
    card?: React.ReactNode;
  }
  title: string;
  description?: string;
  truncatedDescriptionAnchor?: string; // if it's defined, it will truncate and link to the anchor
}

export default function KitHero({
  slots,
  title,
  description,
  truncatedDescriptionAnchor,
}: KitHeroProps) {

  /*
  * flex-col
  *   top slot
  *   content, flex row
  *     details, flex-col
  *       title
  *       description? (with options)
  *       details slot?
  *     card slot?
  *   actions slot?
  *  */

  const slug = makeSlug(title)

  return (
    <Section variant="gradient" className="flex flex-col" id={slug}>
      {/* Top slot */}
      { slots?.top ?? null }
      {/* Content */}
      <div className="Content flex flex-row gap-8">

        <div className="Details flex flex-col gap-6">
            <h1 className="max-w-screen-lg text-kit-huge font-medium">{ title }</h1>
            <div className="max-w-screen-md text-kit-md">
              { truncatedDescriptionAnchor
                ? <KitTruncatedTextWithAnchor text={description} anchor={truncatedDescriptionAnchor} />
                : <p>{description}</p>
              }
            </div>
            { slots?.details ?? null }
        </div>

        { slots?.card ?? null }

      </div>
      { slots?.actions ?? null }
    </Section>
  )
}
