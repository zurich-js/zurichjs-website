import { EventType, MediaType } from '../types/gallery';

export const formatEventDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatMediaCount = (count: number): string => {
  if (count === 0) return 'No items';
  if (count === 1) return '1 item';
  return `${count} items`;
};

export const formatEventType = (eventType: EventType): string => {
  const typeMap = {
    [EventType.ALL]: 'All Events',
    [EventType.MEETUP]: 'Meetups',
    [EventType.WORKSHOP]: 'Workshops',
    [EventType.SOCIAL]: 'Social Events',
    [EventType.CONFERENCE]: 'Conferences'
  };
  return typeMap[eventType];
};

export const formatMediaType = (mediaType: MediaType): string => {
  const typeMap = {
    [MediaType.ALL]: 'All Media',
    [MediaType.PHOTO]: 'Photos',
    [MediaType.VIDEO]: 'Videos'
  };
  return typeMap[mediaType];
};