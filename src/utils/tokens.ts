import jwt from 'jsonwebtoken';

// Define the token payload interface
interface TokenPayload {
  speakerId: string;
  type?: string;
  exp?: number;
  iat?: number;
}

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * Generate a token for a speaker to access their feedback
 * 
 * @param {string} speakerId - The Sanity ID of the speaker
 * @param {number} expiresIn - Token expiration in seconds (default: 30 days)
 * @returns {string} JWT token
 */
export function generateSpeakerToken(speakerId: string, expiresIn: number = 30 * 24 * 60 * 60): string {
  return jwt.sign(
    { 
      speakerId,
      type: 'speaker-feedback' 
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Verify and decode a token
 * 
 * @param {string} token - JWT token to verify
 * @returns {TokenPayload|null} Decoded token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Generate a unique URL for a speaker to view their feedback
 * 
 * @param {string} speakerId - The Sanity ID of the speaker
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} Feedback URL for the speaker
 */
export function generateSpeakerFeedbackUrl(speakerId: string, baseUrl: string): string {
  const token = generateSpeakerToken(speakerId);
  return `${baseUrl}/feedback/speaker/${token}`;
}