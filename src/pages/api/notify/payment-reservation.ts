import { NextApiRequest, NextApiResponse } from 'next';


import { sendPlatformNotification } from '@/lib/notification';


async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      streetAndNumber,
      postcode,
      city,
      country,
      ticketTitle,
      price,
      paymentMethod,
      workshopId,
      eventId,
      ticketType,
      coupon,
    } = req.body;

    // Validate required fields
    if (!name || !email || !ticketTitle || !price || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create payment method text for notifications
    const paymentMethodText = paymentMethod === 'cash' ? 'Cash on Site' : 'Bank Transfer';

    // Create notification title
    const notificationTitle = `New ${paymentMethodText} Reservation: ${ticketTitle}`;
    
    // Create notification message with all relevant details
    const notificationMessage = `
      Name: ${name}
      Email: ${email}
      Address: ${streetAndNumber || 'Not provided'}
      Postcode: ${postcode || 'Not provided'}
      City: ${city || 'Not provided'}
      Country: ${country || 'Not provided'}
      Ticket: ${ticketTitle}
      Price: CHF ${price}
      Payment Method: ${paymentMethodText}
      Type: ${ticketType}
      ${workshopId ? `Workshop ID: ${workshopId}` : ''}
      ${eventId ? `Event ID: ${eventId}` : ''}
      ${coupon ? `Coupon: ${coupon}` : 'No coupon applied'}
      Time: ${new Date().toISOString()}
    `;
    
    
    await sendPlatformNotification({
      title: notificationTitle,
      message: notificationMessage,
      priority: 1, // High priority as number
      sound: 'incoming',
    });

    // In a real implementation, this would also send emails to:
    // 1. The user confirming their reservation
    // 2. The admin team to process the manual payment

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending payment reservation notification:', error);
    return res.status(500).json({
      error: 'Failed to send notification',
    });
  }
}

export default handler;
