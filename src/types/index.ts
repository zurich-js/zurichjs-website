import { Event } from "@/sanity/queries";

export interface Speaker {
  id: string;
  name: string;
  title: string;
  image: string;
  bio?: string;
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  talks: Talk[];
  talkCount: number;
}

export interface Talk {
  id: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  durationMinutes?: number;
  events?: Event[];
  speakers: SpeakerSummary[];
}

export interface SpeakerSummary {
  id: string;
  name: string;
  title: string;
  image: string | null;
}