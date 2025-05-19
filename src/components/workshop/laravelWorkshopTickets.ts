import { TicketOption } from './TicketSelection';

export const laravelWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1RQWvBGxQziVA7FsCDQxAjAi', // Production price ID
    testPriceId: 'price_1RQ6NpGxQziVA7FspQTF8Bdo', // Test price ID (reusing workshop test ID for development)
    title: 'Workshop Only',
    description: 'Access to the Laravel Workshop: From Scratch to Real-Time with Laravel & Reverb',
    price: 225,
    features: [
      '4-hour hands-on workshop',
      'Workshop materials and code examples',
      'Refreshments included',
      'Networking opportunities'
    ]
  },
  {
    id: 'price_1RQWv1GxQziVA7FsUspZ2Sz8', // Production price ID
    testPriceId: 'price_1RQ6LyGxQziVA7FsneNLOrFr', // Test price ID (reusing workshop test ID for development)
    title: 'Workshop + Pro Meetup',
    description: 'Workshop + Pro Meetup Ticket for the following day',
    price: 235,
    features: [
      'Everything in Workshop Only',
      'Access to the next Pro Meetup',
      'Additional networking opportunities',
      'Exclusive content and discussions'
    ]
  }
]; 