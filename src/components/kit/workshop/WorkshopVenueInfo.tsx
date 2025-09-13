import {Building2, MapPin} from "lucide-react";
import Image from "next/image";
import React, {useEffect, useState} from "react";

import KitButton from "@/components/kit/button/KitButton";
import {SBBButton} from "@/components/kit/button/SBBButton";
import KitCopyableText from "@/components/kit/KitCopyableText";

function GoogleMapsButton({ link, ...props }: { link: string}) {
  return (
    <KitButton
      customIcon={(
        <div className="flex items-center justify-end h-[32px] w-[24px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <g clipPath="url(#clip0_51_744)">
              <path d="M5.63477 11.6136C6.12172 12.159 6.60868 12.909 6.81737 13.3863C7.09563 13.9318 7.23477 14.3409 7.44346 15.0227C7.58259 15.4318 7.72172 15.5 7.93042 15.5C8.20868 15.5 8.34781 15.2954 8.41737 15.0227C8.62607 14.3409 8.7652 13.8636 9.04346 13.3863C10.0174 11.5454 11.6174 10.1818 12.5913 8.40905C12.5913 8.40905 13.2174 7.31814 13.2174 5.74996C13.2174 4.31814 12.6609 3.29541 12.6609 3.29541L5.63477 11.6136Z" fill="#34A853"/>
              <path d="M3.26953 8.20459C3.82605 9.50004 4.9391 10.591 5.63475 11.6137L9.5304 6.97732C9.5304 6.97732 8.97388 7.72732 7.99997 7.72732C6.88692 7.72732 5.98258 6.84095 5.98258 5.75004C5.98258 5.00004 6.46953 4.45459 6.46953 4.45459C3.54779 4.86368 3.75649 5.5455 3.26953 8.20459Z" fill="#FBBC04"/>
              <path d="M9.60016 0.772705C10.9219 1.1818 12.0349 2.06816 12.661 3.36361L9.5306 7.04543C9.5306 7.04543 10.0176 6.49998 10.0176 5.74998C10.0176 4.59089 9.04364 3.77271 8.00016 3.77271C7.02625 3.77271 6.46973 4.45452 6.46973 4.45452C6.67842 3.90907 9.18277 0.909069 9.60016 0.772705Z" fill="#4285F4"/>
              <path d="M3.96533 2.34091C4.73055 1.45455 6.12185 0.5 8.00011 0.5C8.90446 0.5 9.60011 0.772727 9.60011 0.772727L6.46968 4.45455C6.26098 4.31818 4.17403 2.75 3.96533 2.34091Z" fill="#1A73E8"/>
              <path d="M3.26967 8.20451C3.26967 8.20451 2.78271 7.18178 2.78271 5.74997C2.78271 4.38633 3.33924 3.15906 4.03489 2.40906L6.53924 4.45451L3.26967 8.20451Z" fill="#EA4335"/>
            </g>
            <defs>
              <clipPath id="clip0_51_744">
                <rect width="16" height="15" fill="white" transform="translate(0 0.5)"/>
              </clipPath>
            </defs>
          </svg>
        </div>
      )}
      tight={true}
      variant="white"
      as={'a' as React.ElementType}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      View on Google Maps
    </KitButton>
  )
}

export default function WorkshopVenueInfo({
  location,
  address,
  floor,
  date,
  startTime
}: {
  location: string;
  address: string;
  floor?: number
  date: string;
  startTime: string;
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
  )
}
