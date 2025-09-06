import {Plus, Share2} from "lucide-react";

import KitButton from "@/components/kit/button/KitButton";


export default function WorkshopActionsSlot() {
  return (
    <div className="flex gap-2.5 w-full max-w-screen-xs">
      <KitButton variant="black" className="flex-1">Grab a seat</KitButton>
      <KitButton lucideIcon={Plus} variant="white">Wishlist</KitButton>
      <KitButton lucideIcon={Share2} variant="white" />
    </div>
  )
}
