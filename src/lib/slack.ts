import { PlatformNotification } from "./notification";

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL || '';

interface SlackPayload {
  channel: string;
  text: string;
  mrkdwn: boolean;
  parse?: string;
}

export async function sendSlackNotification({ 
  message, 
  title, 
  slackChannel,
  url,
  url_title,
  priority,
  html
}: PlatformNotification): Promise<void> {
  if (!SLACK_TOKEN || (!SLACK_DEFAULT_CHANNEL && !slackChannel)) {
    console.warn('Slack is not configured. Skipping Slack notification.');
    return;
  }

  // Format message text
  let text = message;
  if (title) {
    text = `*${title}*\n${text}`;
  }
  
  // Add URL if provided
  if (url) {
    const urlText = url_title || 'Link';
    text += `\n<${url}|${urlText}>`;
  }

  // Build payload
  const payload: SlackPayload = {
    channel: slackChannel || SLACK_DEFAULT_CHANNEL,
    text,
    mrkdwn: true
  };
  
  // Add formatting if html flag is set
  if (html === 1) {
    payload.parse = 'full';
  }
  
  // Handle priority (map Pushover priority to Slack blocks if needed)
  if (typeof priority === 'number') {
    // Optional: use emoji or formatting based on priority
    if (priority === 2) {
      text = `:rotating_light: *URGENT* :rotating_light:\n${text}`;
      payload.text = text;
    } else if (priority === 1) {
      text = `:warning: *High Priority* :warning:\n${text}`;
      payload.text = text;
    }
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!result.ok) {
    console.error('Slack notification failed:', result);
  }
}