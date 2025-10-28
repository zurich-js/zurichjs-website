import {SquareArrowOutUpRight, Globe, Linkedin, Twitter, Github} from 'lucide-react';
import Image, { ImageProps } from "next/image";
import Link from "next/link";

import {Speaker} from "@/types";

interface WorkshopSpeakerCardProps {
  speaker: Speaker & {
    companyLogo?: ImageProps['src'];
  }
  className?: string;
}

function SpeakerSocialLink({ url, icon }: { url: string, icon: 'linkedin' | 'twitter' | 'github' | 'website' }) {
  return (
    <Link
      href={url}
      target="_blank"
      className="flex size-5 items-center justify-center text-kit-gray-dark hover:text-black rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zurich focus:text-black transition-colors duration-300"
    >
      {icon === 'linkedin' && <Linkedin size={16} />}
      {icon === 'twitter' && <Twitter size={16} />}
      {icon === 'github' && <Github size={16} />}
      {icon === 'website' && <Globe size={16} />}
    </Link>
  )
}

export default function WorkshopHero_Speaker({
  speaker,
  className = ''
}: WorkshopSpeakerCardProps) {

  return (
    <div className={`flex flex-col gap-5 bg-white h-fit rounded-xl shadow-md p-5 min-w-screen-xs max-w-screen-sm flex-1 ${className}`}>
      <div className="flex items-start gap-5">
        <Image
          src={speaker.image}
          alt={speaker.name + ' avatar'}
          width={64}
          height={64}
          className="size-20 rounded object-cover aspect-square border-2 border-kit-gray-medium"
        />
        <div className="flex flex-col gap-1">
          <Link
            href={`/speakers/${speaker.id}`}
            className="inline-block text-kit-lg font-medium text-inherit no-underline border-b border-transparent border-dashed group hover:border-black transition-all duration-300 w-fit"
          >
            {speaker.name}
            <SquareArrowOutUpRight size={12} className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </Link>
          <p className="text-kit-base">{speaker.title}</p>
          {speaker.company && (
              <p className="text-kit-base text-kit-gray-dark">@{speaker.company}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-kit-sm">Social links</p>
        <ul className="flex flex-row gap-2">
          {speaker.linkedin && <li><SpeakerSocialLink url={speaker.linkedin} icon="linkedin" /></li>}
          {speaker.twitter && <li><SpeakerSocialLink url={speaker.twitter} icon="twitter" /></li>}
          {speaker.github && <li><SpeakerSocialLink url={speaker.github} icon="github" /></li>}
          {speaker.website && <li><SpeakerSocialLink url={speaker.website} icon="website" /></li>}
        </ul>
      </div>
      {speaker.companyLogo && (
        <div className="flex items-center justify-center flex-1 min-h-32">
          <Image src={speaker.companyLogo} alt={speaker.company ?? ''} height={100} width={250} />
        </div>
      )}
    </div>
  )
}
