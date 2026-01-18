import { TicketOption } from './TicketSelection';

export const aiDesignPatternsTickets: TicketOption[] = [
  {
    id: 'price_1S51PrGxQziVA7FsrDPnC7Qo',
    title: 'Early Bird Ticket',
    description: 'Limited time offer - Only 10 tickets available!',
    price: 525,
    testPriceId: 'price_1S51HyGxQziVA7Fsee4czI58', // Test environment price ID
    ticketType: 'workshop',
    workshopId: 'ai-design-patterns-2026',
    availableUntil: '2025-12-01', // Early bird ends December 1st, 2025
    features: [
      '8 hours of intensive learning',
      'Lunch and refreshments included',
      'Workshop materials provided',
      'Early bird special pricing'
    ],
    autoSelect: true,
  },
  {
    id: 'price_1S51PrGxQziVA7FsvNtDc9M3',
    title: 'Standard Ticket',
    description: 'Full workshop access at standard pricing',
    price: 595,
    testPriceId: 'price_1S51HyGxQziVA7FsooqBy3Hf', // Test environment price ID
    ticketType: 'workshop',
    workshopId: 'ai-design-patterns-2026',
    availableFrom: '2025-12-01', // Available after early bird ends
    availableUntil: '2026-03-01', // Until late bird starts
    features: [
      '8 hours of intensive learning',
      'Lunch and refreshments included',
      'Workshop materials provided',
    ],
  },
  {
    id: 'price_1S51PrGxQziVA7FspIyTNwxg',
    title: 'Late Bird Ticket',
    description: 'Last chance booking - Higher pricing applies',
    price: 625,
    testPriceId: 'price_1S51HyGxQziVA7Fs9gUB9xIM', // Test environment price ID
    ticketType: 'workshop',
    workshopId: 'ai-design-patterns-2026',
    availableFrom: '2026-02-01', // Starts March 1st, 2026
    features: [
      '8 hours of intensive learning',
      'Lunch and refreshments included',
      'Workshop materials provided',
    ],
  }
];

// Team discount configuration
export const teamDiscounts = {
  three_plus: {
    minQuantity: 3,
    discount: 0.10, // 10% off
    description: '10% off for teams of 3 or more'
  },
  five_plus: {
    minQuantity: 5,
    discount: 0.20, // 20% off  
    description: '20% off for teams of 5 or more'
  }
};