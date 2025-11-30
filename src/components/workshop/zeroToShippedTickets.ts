import { TicketOption } from './TicketSelection';

export const zeroToShippedTickets: TicketOption[] = [
  {
    id: 'price_1SZE7vGxQziVA7FsQDisTRIh', // Replace with actual Stripe price ID
    title: 'Workshop Ticket',
    description: 'Full workshop access',
    price: 495,
    testPriceId: 'price_1SZE5xGxQziVA7FsAF1hnJxf', // Replace with test environment price ID
    ticketType: 'workshop',
    workshopId: 'zerotoshipped-fullstack-2026',
    features: [
      '4 hours of intensive hands-on learning',
      'Build and ship a production-ready app',
      'Workshop materials and starter repo',
      'Certificate of completion'
    ],
    autoSelect: true,
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
