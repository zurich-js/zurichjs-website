import { EventType, MediaType } from '../types/gallery';

// Data passed as props to the root component
export const mockRootProps = {
  initialMedia: [
    {
      id: '1',
      url: 'https://ik.imagekit.io/zurichjs/gallery/meetup-1-group.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-auto,q-85,dpr-2,pr-true/meetup-1-group.jpg',
      type: MediaType.PHOTO,
      eventType: EventType.MEETUP,
      eventName: 'React Hooks Deep Dive',
      eventDate: '2024-01-15T18:30:00Z',
      photographer: 'Sarah Chen',
      tags: ['react', 'hooks', 'frontend'],
      description: 'Group photo from our React Hooks meetup',
      width: 1920,
      height: 1080
    },
    {
      id: '2',
      url: 'https://ik.imagekit.io/zurichjs/gallery/workshop-typescript.mp4',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-jpg,t-1,q-85,dpr-2,pr-true/workshop-typescript-thumb.jpg',
      type: MediaType.VIDEO,
      eventType: EventType.WORKSHOP,
      eventName: 'TypeScript Workshop',
      eventDate: '2024-02-20T10:00:00Z',
      photographer: 'Mike Rodriguez',
      tags: ['typescript', 'workshop', 'learning'],
      description: 'Highlights from our TypeScript workshop',
      duration: 180,
      width: 1920,
      height: 1080
    },
    {
      id: '3',
      url: 'https://ik.imagekit.io/zurichjs/gallery/social-networking.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-auto,q-85,dpr-2,pr-true/social-networking.jpg',
      type: MediaType.PHOTO,
      eventType: EventType.SOCIAL,
      eventName: 'Summer Networking BBQ',
      eventDate: '2024-03-10T17:00:00Z',
      photographer: 'Anna Weber',
      tags: ['networking', 'social', 'community'],
      description: 'Community members enjoying our summer BBQ',
      width: 1920,
      height: 1280
    },
    {
      id: '4',
      url: 'https://ik.imagekit.io/zurichjs/gallery/conference-keynote.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-auto,q-85,dpr-2,pr-true/conference-keynote.jpg',
      type: MediaType.PHOTO,
      eventType: EventType.CONFERENCE,
      eventName: 'JavaScript Conference 2024',
      eventDate: '2024-04-15T09:00:00Z',
      photographer: 'David Kim',
      tags: ['conference', 'keynote', 'javascript'],
      description: 'Keynote speaker at our annual conference',
      width: 1920,
      height: 1080
    },
    {
      id: '5',
      url: 'https://ik.imagekit.io/zurichjs/gallery/workshop-node.mp4',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-jpg,t-1,q-85,dpr-2,pr-true/workshop-node-thumb.jpg',
      type: MediaType.VIDEO,
      eventType: EventType.WORKSHOP,
      eventName: 'Node.js Backend Workshop',
      eventDate: '2024-05-08T14:00:00Z',
      photographer: 'Lisa Zhang',
      tags: ['nodejs', 'backend', 'api'],
      description: 'Building APIs with Node.js workshop highlights',
      duration: 240,
      width: 1920,
      height: 1080
    },
    {
      id: '6',
      url: 'https://ik.imagekit.io/zurichjs/gallery/meetup-vue.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/zurichjs/gallery/tr:w-800,h-800,c-at_max,f-auto,q-85,dpr-2,pr-true/meetup-vue.jpg',
      type: MediaType.PHOTO,
      eventType: EventType.MEETUP,
      eventName: 'Vue.js 3 Composition API',
      eventDate: '2024-06-12T18:30:00Z',
      photographer: 'Tom Mueller',
      tags: ['vue', 'composition-api', 'frontend'],
      description: 'Exploring Vue 3 Composition API features',
      width: 1920,
      height: 1280
    }
  ],
  totalCount: 156,
  featuredEvents: [
    {
      id: 'event-1',
      name: 'React Hooks Deep Dive',
      date: '2024-01-15T18:30:00Z',
      mediaCount: 24
    },
    {
      id: 'event-2', 
      name: 'TypeScript Workshop',
      date: '2024-02-20T10:00:00Z',
      mediaCount: 18
    },
    {
      id: 'event-3',
      name: 'Summer Networking BBQ',
      date: '2024-03-10T17:00:00Z',
      mediaCount: 32
    }
  ]
};