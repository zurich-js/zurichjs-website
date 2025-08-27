import {GraduationCap} from "lucide-react";

import Backlink from "@/components/kit/BackLink";
import KitChip from "@/components/kit/KitChip";

export default function WorkshopTopSlot() {
  return (
    <>
      <Backlink className="block relative -translate-y-12" href="/workshops">Back to workshops</Backlink>
      <KitChip variant="blue" icon={GraduationCap} iconSize={12}>Workshop</KitChip>
    </>
  )
}
