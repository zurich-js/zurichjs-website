import { TicketOption } from './TicketSelection';

export const workshopTickets: TicketOption[] = [
  {
    id: 'price_1RNBioGxQziVA7FsGUNhc2Ag', // Production price ID
    testPriceId: 'price_1RNCL3GxQziVA7FskRzSk2hf', // Test price ID
    title: 'Workshop Only',
    description: 'Access to the Node.js Threads Workshop',
    price: 100,
    features: [
      '2-hour hands-on workshop',
      'Workshop materials and code examples',
      'Apero style food and drinks',
      'Networking opportunities'
    ]
  },
  {
    id: 'price_1RNBk0GxQziVA7FsGd4IO3ro', // Production price ID
    testPriceId: 'price_1RNCKfGxQziVA7FsNqpFZehv', // Test price ID
    title: 'Workshop + Pro Meetup',
    description: 'Workshop + June 19th Pro Meetup Ticket',
    price: 110,
    features: [
      'Everything in Workshop Only',
      'Access to the Pro Meetup on June 19th',
      'Additional networking opportunities',
      'Exclusive content and discussions'
    ]
  }
]; 