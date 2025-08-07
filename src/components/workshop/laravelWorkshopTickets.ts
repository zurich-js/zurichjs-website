import { TicketOption } from './TicketSelection';

export const laravelWorkshopTickets: TicketOption[] = [
  {
    id: 'price_1RQWvBGxQziVA7FsCDQxAjAi', // Production price ID
    testPriceId: 'price_1RQ6NpGxQziVA7FspQTF8Bdo', // Test price ID (reusing workshop test ID for development)
    title: 'Workshop Only',
    description: 'Access to the Laravel Workshop: From Scratch to Real-Time with Laravel & Reverb',
    price: 225,
    ticketType: 'workshop',
    workshopId: 'laravel-workshop',
    features: [
      '4-hour hands-on workshop',
      'Workshop materials and code examples',
      'Refreshments included',
      'Networking opportunities'
    ]
  }
]; 