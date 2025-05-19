import { TicketOption } from './TicketSelection';

export const astroWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1RQWurGxQziVA7FscgrUyAyO', // Production price ID
    testPriceId: 'price_1RQ6KnGxQziVA7FsdHks8zWL', // Test price ID (reusing nodejs workshop test ID for development)
    title: 'Workshop Only',
    description: 'Access to the Astro Zero to Hero Workshop',
    price: 225,
    features: [
      '4-hour hands-on workshop',
      'Workshop materials and code examples',
      'Refreshments included',
      'Networking opportunities'
    ]
  },
  {
    id: 'price_1RQWuyGxQziVA7Fs37EGVorN', // Production price ID
    testPriceId: 'price_1RQ6KCGxQziVA7FsatbNkH3k', // Test price ID (reusing nodejs workshop test ID for development)
    title: 'Workshop + Pro Meetup',
    description: 'Workshop + July 24th Pro Meetup Ticket',
    price: 235,
    features: [
      'Everything in Workshop Only',
      'Access to the Pro Meetup on July 24th',
      'Additional networking opportunities',
      'Exclusive content and discussions'
    ]
  }
]; 