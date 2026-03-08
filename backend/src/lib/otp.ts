import { createHash, randomInt } from 'crypto';

/** Generate a random 6-digit numeric OTP */
export function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

/** SHA-256 hash of an OTP for safe storage */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}
