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
  }
]; 