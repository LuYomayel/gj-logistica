import axios from 'axios';

/**
 * Extract a user-friendly error message from an API error response.
 * Falls back to the provided message if the backend didn't send one.
 *
 * NestJS sends errors as:
 *   { statusCode: 400, message: "string" | ["array of strings"], error: "Bad Request" }
 */
export function apiErrMsg(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
}
