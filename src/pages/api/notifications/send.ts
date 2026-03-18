import type { APIContext } from 'astro';

import { sendPlatformNotification } from '@/lib/notification';

export const prerender = false;

interface PlatformNotification {
  title: string;
  message: string;
  type: 'referral' | 'event' | 'workshop' | 'tshirt' | 'merch-suggestion' | 'tap_to_pay_success' | 'other';
  priority: 'low' | 'normal' | 'high';
  slackChannel?: string;
  userData?: {
    name: string;
    email: string;
    userId: string;
    isLoggedIn: boolean;
  };
  eventData?: {
    eventId: string;
    eventTitle: string;
  };
  feedbackData?: {
    overallRating: number;
    worthTime: string;
    wouldRecommend: string;
    ratings: {
      food: number;
      drinks: number;
      talks: number;
      timing: number;
      execution: number;
      dealOfDay: number;
    };
    comments: {
      food: string;
      drinks: string;
      talks: string;
      timing: string;
      execution: string;
      dealOfDay: string;
      improvements: string;
      futureTopics: string;
      additional: string;
    };
  };
}

export async function POST(context: APIContext) {
  try {
    const notification: PlatformNotification = await context.request.json();

    // Validate required fields
    if (!notification.title || !notification.message || !notification.type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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

    // Log detailed data for debugging (especially useful for feedback)
    if (notification.type === 'event' && notification.feedbackData) {
      console.log('Detailed feedback submission:', {
        user: notification.userData,
        event: notification.eventData,
        feedback: notification.feedbackData,
        timestamp: new Date().toISOString()
      });
    }

    // Log Tap to Pay transactions for audit trail
    if (notification.type === 'tap_to_pay_success') {
      console.log('Tap to Pay transaction completed:', {
        timestamp: new Date().toISOString(),
        notification: notification,
      });
    }

    // Send the notification using the real notification system
    await sendPlatformNotification({
      title: notification.title,
      message: notification.message,
      priority: priorityMap[notification.priority],
      slackChannel: notification.slackChannel || undefined
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
