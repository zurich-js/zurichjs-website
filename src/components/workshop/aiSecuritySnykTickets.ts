import { TicketOption } from "./TicketSelection";

export const aiSecuritySnykTickets: TicketOption[] = [
  {
    id: "price_snyk_early_bird_2026", // Replace with actual Stripe price ID
    title: "Early Bird Ticket",
    description: "Limited time offer - Save 30 CHF!",
    price: 95,
    testPriceId: "price_test_snyk_early_bird_2026", // Test environment price ID
    ticketType: "workshop",
    workshopId: "ai-security-snyk-2026",
    availableUntil: "2026-01-23", // Early bird ends January 23rd, 2026
    features: [
      "2.5 hours of hands-on training",
      "Snyk AI Security Certificate",
      "Workshop materials included",
      "Early bird special pricing",
    ],
    autoSelect: true,
  },
  {
    id: "price_snyk_standard_2026", // Replace with actual Stripe price ID
    title: "Standard Ticket",
    description: "Full workshop access at standard pricing",
    price: 125,
    testPriceId: "price_test_snyk_standard_2026", // Test environment price ID
    ticketType: "workshop",
    workshopId: "ai-security-snyk-2026",
    availableFrom: "2026-01-23", // Available after early bird ends
    features: [
      "2.5 hours of hands-on training",
      "Snyk AI Security Certificate",
      "Workshop materials included",
    ],
  },
];

// Team discount configuration
