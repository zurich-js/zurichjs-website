import { TicketOption } from '../workshop/TicketSelection';

export const getEventTicket = (eventId: string, title: string, price: number = 10, stripePriceId: string = ''): TicketOption[] => [
  {
    id: stripePriceId, // Production price ID from the event.stripePriceId
    title: 'Pro Meetup Ticket',
    description: `Access to ${title}`,
    price: price,
    features: [
      'Full access to the pro meetup',
      'Networking opportunities',
      'Food and drinks included',
      'Q&A sessions with speakers'
    ],
    autoSelect: true, // Auto-select this option when loaded
    ticketType: 'event', // Specify this is an event ticket
    eventId: eventId // Include the event ID for the success page
  }
]; 