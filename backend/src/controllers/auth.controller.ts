import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendOtpEmail } from '../lib/mailer';
import { generateOtp, hashOtp } from '../lib/otp';
import { AuthRequest } from '../middleware/auth.middleware';

const OTP_EXPIRY_MINUTES = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function issueOtp(email: string, username?: string): Promise<void> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  // Invalidate any outstanding unused codes for this email
  await prisma.otpCode.updateMany({ where: { email, used: false }, data: { used: true } });
  await prisma.otpCode.create({ data: { email, code: hashOtp(otp), expiresAt } });
  await sendOtpEmail(email, otp, username);
}

// ── Controllers ──────────────────────────────────────────────────────────────

/** POST /api/auth/register  { email, username } */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, username } = req.body;
  if (!email || !username) {
    res.status(400).json({ message: 'Email and username are required' });
    return;
  }
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing?.email === email) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }
    if (existing?.username === username) {
      res.status(409).json({ message: 'Username already taken' });
      return;
    }
    await prisma.user.create({ data: { email, username } });
    await issueOtp(email, username);
    res.status(201).json({ message: `Verification code sent to ${email}`, email });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/** POST /api/auth/request-otp  { email } */
export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return 200 to avoid leaking whether an email is registered
    if (user) {
      await issueOtp(email, user.username);
    }
    res.json({ message: `If that email is registered, a code has been sent`, email });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/** POST /api/auth/verify-otp  { email, otp } */
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ message: 'Email and code are required' });
    return;
  }
  try {
    const record = await prisma.otpCode.findFirst({
      where: {
        email,
        code: hashOtp(String(otp)),
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) {
      res.status(401).json({ message: 'Invalid or expired code' });
      return;
    }
    await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

/** GET /api/auth/me */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};
