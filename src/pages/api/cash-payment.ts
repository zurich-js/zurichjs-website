import { getAuth } from '@clerk/nextjs/server';
import { NextApiRequest, NextApiResponse } from 'next';

// In a real app, you would use a database to store this information
const paymentReservations = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    
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
    } = req.body;

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
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate payment method
    if (paymentMethod !== 'cash' && paymentMethod !== 'bank') {
      return res.status(400).json({ error: 'Invalid payment method' });
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
    return res.status(200).json({ 
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
    });
    
  } catch (error) {
    console.error('Payment reservation error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing your request'
    });
  }
} 