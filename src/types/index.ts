export interface Speaker {
  _id: string;
  id: string;
  name: string;
  title?: string;
  email?: string;
  bio?: string;
  image: string;
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  company?: string;
  location?: string;
  interests?: string[];
  isVisible?: boolean;
  talks: Talk[];
  talkCount: number;
}

export interface Talk {
  _id: string;
  id: string;
  title: string;
  description?: string;
  type?: string;
  tags?: string[];
  durationMinutes?: number;
  slides?: string;
  videoUrl?: string;
  events: Array<{
    id: string;
    title: string;
    datetime: string;
    location: string;
  }>;
  speakers: Array<{
    id: string;
    name: string;
    title?: string;
    image: string;
  }>;
}

export interface ProductDemo {
  _id: string;
  _type?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _rev?: string;
  name: string;
  description: string;
  logo: string | null;
  websiteUrl: string;
}

export interface ProductFeedbackData {
  productId: string;
  productName?: string;
  rating: number;
  interests: string[];
  questions: string;
  learningPreferences: string[];
  detailedFeedback: string;
}
