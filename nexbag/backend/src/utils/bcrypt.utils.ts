import bcrypt from 'bcryptjs';

// bcrypt cost factor 12 per Security.md §4
const COST_FACTOR = 12;

// ─── Hash a password ──────────────────────────────────────────────────────────
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, COST_FACTOR);
}

// ─── Compare plaintext with hash (constant-time) ─────────────────────────────
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
