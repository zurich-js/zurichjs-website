import { sendPushoverNotification } from "./pushover";
import { sendSlackNotification } from "./slack";

export interface PlatformNotification {
  title?: string;
  message: string;
  priority?: number;
  sound?: string;
  url?: string;
  url_title?: string;
  html?: number;
  slackChannel?: string; // optional: for routing Slack messages
}

export async function sendPlatformNotification(notification: PlatformNotification): Promise<void> {
  await Promise.all([
    sendPushoverNotification(notification),
    sendSlackNotification(notification)
  ]);
}