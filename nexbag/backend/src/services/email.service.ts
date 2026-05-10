import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ── Create transporter (lazy — skips creation if SMTP not configured in dev) ──
function createTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export const emailService = {
  async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
    const transporter = createTransporter();

    if (!transporter) {
      // Lenient dev mode: log OTP to console instead of sending email
      logger.warn(`[DEV MODE] OTP for ${to}: ${otp} (Email not configured — showing in logs)`);
      return;
    }

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Your Smart Bag-Pack Password Reset OTP',
        html: `
          <h2>Password Reset</h2>
          <p>Hi ${name},</p>
          <p>Your OTP for password reset is:</p>
          <h1 style="letter-spacing: 8px; font-size: 48px; color: #3D3BF3;">${otp}</h1>
          <p>This OTP expires in <strong>15 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>— Smart Bag-Pack Team</p>
        `,
      });
    } catch (err) {
      logger.error('Email send failed', { err, to });
      // Don't throw — OTP is already stored; user can try again
    }
  },
};
