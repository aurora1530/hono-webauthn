export const rpName = 'Hono WebAuthn Example';
export const rpID = 'localhost';
export const origin = process.env.NODE_ENV === 'production' ? '' : `http://${rpID}:3000`;
