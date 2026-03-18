import type { APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const prerender = false;

// In a real app, you would use a database to store this information
const paymentReservations = new Map();

export async function POST(context: APIContext) {
  try {
    const auth = context.locals.auth();
    const userId = auth?.userId;

    const {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      eventId,
      workshopId,
      ticketType,
      paymentMethod = 'cash', // Default to cash if not specified
    } = await context.request.json();

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!streetAndNumber) missingFields.push('streetAndNumber');
    if (!postcode) missingFields.push('postcode');
    if (!city) missingFields.push('city');
    if (!country) missingFields.push('country');
    if (!ticketTitle) missingFields.push('ticketTitle');
    if (price === undefined) missingFields.push('price');
    if (!eventId && !workshopId) missingFields.push('eventId or workshopId');

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate payment method
    if (paymentMethod !== 'cash' && paymentMethod !== 'bank') {
      return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create reservation data
    const reservation = {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      userId,
      eventId,
      workshopId,
      ticketType,
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // In a real implementation, you would save this to a database

    // Store it in memory for demo purposes
    const reservationKey = `${email}-${eventId || workshopId}`;
    paymentReservations.set(reservationKey, reservation);

    // Return success with user details instead of session ID
    return new Response(JSON.stringify({
      success: true,
      reservation: {
        name,
        email,
        streetAndNumber,
        postcode,
        city,
        country,
        ticketTitle,
        price,
        paymentMethod,
        eventId,
        workshopId,
        ticketType
      },
      message: `${paymentMethod === 'cash' ? 'Cash' : 'Bank transfer'} payment reservation created successfully`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment reservation error:', error);
    return new Response(JSON.stringify({
      error: 'An error occurred while processing your request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
