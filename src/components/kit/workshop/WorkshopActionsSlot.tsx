import {Plus, Share2} from "lucide-react";

import KitButton from "@/components/kit/button/KitButton";


export default function WorkshopActionsSlot({
  rsvp,
  wishlist
}: {
  rsvp?: string;
  wishlist?: string;
}) {
  function onShare() {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // copy to clipboard as fallback
      navigator.clipboard.writeText(window.location.href).then(() => {
          alert('Link copied to clipboard');
      }).catch((error) => console.log('Error copying link to clipboard', error));
    }
  }

  return (
    <div className="flex gap-2.5 w-full max-w-screen-xs">
      <KitButton
        as="a"
        variant="black"
        className="flex-1 text-center"
        {...(rsvp ? { href: `#${rsvp}` } : { disabled: true })}
      >
        Grab a seat
      </KitButton>
      <KitButton
        lucideIcon={Plus}
        variant="white"
        {...(wishlist ? { href: wishlist, target: '_blank' } : { disabled: true })}
      >
        Wishlist
      </KitButton>
      <KitButton lucideIcon={Share2} variant="white" onClick={onShare} />
    </div>
  )
}
