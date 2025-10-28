import {Building2, MapPin} from "lucide-react";
import Image from "next/image";
import React, {useEffect, useState} from "react";

import GoogleMapsButton from "@/components/v2/kit/button/composed/GoogleMapsButton";
import SBBButton from "@/components/v2/kit/button/composed/SBBButton";
import KitCopyableText from "@/components/v2/kit/KitCopyableText";
import WorkshopSection from "@/components/v2/workshop/WorkshopSection";

export default function WorkshopSectionVenueInfo({
  location,
  address,
  floor,
  date,
  startTime,
  slug = 'venue-info',
  title = 'Venue Info',
}: {
  location: string;
  address: string;
  floor?: number
  date: string;
  startTime: string;
  slug?: string;
  title?: string;
}) {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    // avoid fetching on local
    // setMapUrl('https://maps.googleapis.com/maps/api/staticmap?center=Steinstrasse%2021%2C%208003%20Z%C3%BCrich&zoom=15&size=600x300&markers=color:yellow%7CSteinstrasse%2021%2C%208003%20Z%C3%BCrich&key=AIzaSyB8ygeJDxMJGhwmz5YmFv1MlWOCFCkCyM4');
    (async () => {
      const response = await fetch(`/api/google-maps?location=${encodeURIComponent(address || location)}`);
      const data = await response.json();
      setMapUrl(data.url);
    })();
  }, [address, location]);

  const sbbUrl = (() => {
    const from = encodeURIComponent('Zürich HB');
    const to = encodeURIComponent(address);

    const dateParts = date.split('-');
    if (dateParts.length !== 3) return '';

    const dateString = encodeURIComponent(
      dateParts[2].length === 4
        ? dateParts.reverse().join('-')
        : date
    )

    return `https://www.sbb.ch/en?von=${from}&nach=${to}&date=%22${dateString}%22&time=%22${startTime}%22&moment="ARRIVAL"`;
  })()

  const floorText = (() => {
    if (floor === undefined) return '';
    if (floor === 0) return 'Ground floor';
    if (floor % 10 === 1 && floor !== 11) return `${floor}st floor`;
    if (floor % 10 === 2 && floor !== 12) return `${floor}nd floor`;
    if (floor % 10 === 3 && floor !== 13) return `${floor}rd floor`;
    return `${floor}th floor`;
  })()

  return (
    <WorkshopSection slug={slug} title={title} layout="section">
      <div className="flex gap-5 py-4">
        <div className="flex flex-col gap-2">
          <p className="flex gap-1 text-kit-sm">
            <Building2 size={14} />
            {location}
          </p>
          <p className="flex gap-1 text-kit-sm">
            <MapPin size={14} />
            <span><KitCopyableText text={address} className="text-black hover:text-zurich" /><br/>{floorText}</span>
          </p>
          <div className="flex flex-col gap-2 mt-auto">
            <GoogleMapsButton link={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || location)}`}/>
            <SBBButton link={sbbUrl} />
          </div>
        </div>
        <div className="relative min-h-48 w-full aspect-video rounded-lg border border-kit-gray-medium overflow-hidden">
          {mapUrl ? (
            <Image
              src={mapUrl}
              alt={`Map of ${location}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-kit-gray-dark">Map loading...</p>
            </div>
          )}
        </div>
      </div>
    </WorkshopSection>
  )
}
