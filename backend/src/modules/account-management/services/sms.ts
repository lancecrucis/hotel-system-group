import { env } from '../../../config/env.js';

function devCode(phone: string, code: string) {
  if (env.NODE_ENV !== 'production') {
    console.log(`[SMS] ${phone}: verification code is ${code}`);
  }
}

export function sendPhoneCode(phone: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const provider = env.SMS_PROVIDER;

  if (!provider || provider === 'console') {
    devCode(phone, code);
    return code;
  }

  // Future: Twilio, etc.
  throw new Error(`SMS provider '${provider}' is not yet implemented.`);
}

// For reservation notifications and future SMS use
export function sendReservationSMS(phone: string, message: string) {
  devCode(phone, `[RESERVATION] ${message}`);
}