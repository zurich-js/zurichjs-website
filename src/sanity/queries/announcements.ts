import { client } from '../client';

export interface Announcement {
  id: string;
  type: 'event' | 'promotion' | 'workshop' | 'general';
  title: string;
  message: string;
  cta?: {
    text: string;
    href: string;
  };
  conditions?: {
    startDate?: string;
    endDate?: string;
    requiresLogin?: boolean;
  };
}

export const getCurrentAnnouncement = async (): Promise<Announcement[]> => {
  try {
    return await client.fetch<Announcement[]>(`
      *[_type == "announcement"] {
        "id": id.current,
        type,
        title,
        message,
        cta,
        conditions
      } | order(conditions.startDate desc)
    `);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
};
