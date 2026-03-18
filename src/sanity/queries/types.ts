// Shared Sanity data types
export interface SanityImage {
  asset: {
    url: string;
  };
}

export interface SanitySpeaker {
  _id: string;
  id: { current: string };
  name: string;
  title: string;
  image: SanityImage;
  [key: string]: unknown;
}

export interface SanitySpeakerWithTalks {
  _id: string;
  id: string;
  name: string;
  title?: string;
  email?: string;
  bio?: string;
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  company?: string;
  location?: string;
  interests?: string[];
  isVisible?: boolean;
  image: {
    asset: {
      url: string;
    };
  };
  talks: Array<{
    id: string;
    title: string;
    description?: string;
    type?: string;
    tags?: string[];
    durationMinutes?: number;
    events: Array<{
      id: string;
      title: string;
      datetime: string;
      location: string;
    }>;
  }>;
}

export interface SanityTalk {
  _id: string;
  id: { current: string };
  title: string;
  description: string;
  type: string;
  tags: string[];
  slides: string;
  videoUrl: string;
  durationMinutes?: number;
  speakers: SanitySpeaker[];
  productDemo?: {
    id: { current: string };
    name: string;
    description: string;
    logo: SanityImage;
    websiteUrl: string;
  };
  productDemos?: Array<{
    id: { current: string };
    name: string;
    description: string;
    logo: SanityImage;
    websiteUrl: string;
  }>;
  [key: string]: unknown;
}

export interface SanityEvent {
  _id: string;
  id: { current: string };
  title: string;
  datetime: string;
  location: string;
  address: string;
  attendees: number;
  image: SanityImage;
  isProMeetup: boolean;
  stripePriceId: string;
  description: string;
  meetupUrl: string;
  talks: SanityTalk[];
  excludeFromStats?: boolean;
  [key: string]: unknown;
}
