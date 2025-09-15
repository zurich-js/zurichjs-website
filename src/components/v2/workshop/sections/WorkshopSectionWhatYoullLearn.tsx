import {LucideIcon} from "lucide-react";
import React from "react";

import KitLinkButton from "@/components/v2/kit/button/KitLinkButton";
import {KitModal} from "@/components/v2/kit/structure/KitModal";
import WorkshopSectionGrid from "@/components/v2/workshop/WorkshopSectionGrid";

export default function WorkshopSectionWhatYoullLearn({
  syllabusContent,
  gridItems
}: {
  syllabusContent: React.ReactNode;
  gridItems: {
      icon: LucideIcon;
      title: string;
      description: string | React.ReactNode;
  }[];
}) {
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = React.useState(false);

  return (
    <>
      <WorkshopSectionGrid
        slug="what-youll-learn"
        title="What you'll learn"
        titleChildren={
          <KitLinkButton onClick={()=>setIsSyllabusModalOpen(true)} className="mt-2">
            See full syllabus
          </KitLinkButton>
        }
        gridItems={gridItems}
      />
      <KitModal
        isOpen={isSyllabusModalOpen}
        onClose={() => setIsSyllabusModalOpen(false)}
      >
        {syllabusContent}
      </KitModal>
    </>
  )
}
