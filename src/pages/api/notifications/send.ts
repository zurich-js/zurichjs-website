import { NextApiRequest, NextApiResponse } from 'next';

import { sendPlatformNotification } from '@/lib/notification';

interface PlatformNotification {
  title: string;
  message: string;
  type: 'referral' | 'event' | 'workshop' | 'tshirt' | 'merch-suggestion' | 'other';
  priority: 'low' | 'normal' | 'high';
  slackChannel?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notification: PlatformNotification = req.body;
    
    // Validate required fields
    if (!notification.title || !notification.message || !notification.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Set default priority if not provided
    if (!notification.priority) {
      notification.priority = 'normal';
    }
    
    // Map priority strings to numbers for the notification system
    const priorityMap = {
      'low': 0,
      'normal': 1, 
      'high': 2
    };
    
    // Send the notification using the real notification system
    await sendPlatformNotification({
      title: notification.title,
      message: notification.message,
      priority: priorityMap[notification.priority],
      slackChannel: notification.slackChannel || undefined
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
} 