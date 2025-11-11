import { TicketOption } from './TicketSelection';

export const aiSecuritySnykTickets: TicketOption[] = [
  {
    id: 'price_snyk_early_bird_2026', // Replace with actual Stripe price ID
    title: 'Early Bird Ticket',
    description: 'Limited time offer - Save 30 CHF!',
    price: 95,
    testPriceId: 'price_test_snyk_early_bird_2026', // Test environment price ID
    ticketType: 'workshop',
    workshopId: 'ai-security-snyk-2026',
    availableUntil: '2026-01-23', // Early bird ends January 23rd, 2026
    features: [
      '2.5 hours of hands-on training',
      'Snyk AI Security Certificate',
      'Workshop materials included',
      'Early bird special pricing'
    ],
    autoSelect: true,
  },
  {
    id: 'price_snyk_standard_2026', // Replace with actual Stripe price ID
    title: 'Standard Ticket',
    description: 'Full workshop access at standard pricing',
    price: 125,
    testPriceId: 'price_test_snyk_standard_2026', // Test environment price ID
    ticketType: 'workshop',
    workshopId: 'ai-security-snyk-2026',
    availableFrom: '2026-01-23', // Available after early bird ends
    features: [
      '2.5 hours of hands-on training',
      'Snyk AI Security Certificate',
      'Workshop materials included',
    ],
  }
];

// Team discount configuration
export const teamDiscounts = {
  three_plus: {
    minQuantity: 3,
    discount: 0.15, // 15% off
    description: '15% off for teams of 3-4'
  },
  five_plus: {
    minQuantity: 5,
    discount: 0.25, // 25% off
    description: '25% off for teams of 5+'
  }
};
