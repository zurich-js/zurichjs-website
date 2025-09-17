import {GraduationCap} from "lucide-react";

import KitBackLink from "@/components/kit/KitBackLink";
import KitChip from "@/components/kit/KitChip";

export default function WorkshopTopSlot() {
  return (
    <>
      <KitBackLink className="block relative -translate-y-12" href="/workshops">Back to workshops</KitBackLink>
      <KitChip variant="blue" icon={GraduationCap} iconSize={12}>Workshop</KitChip>
    </>
  )
}
