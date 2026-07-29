import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { registrationRateLimit, emailRegistrationRateLimit } from '@/lib/rate-limiter';
import { validatePassword } from '@/lib/password-policy';
import { sendWelcomeEmail } from '@/lib/mailer';
import { appUrl } from '@/lib/links';
import { verifyCaptcha } from '@/lib/captcha';
import { reportConversion, userDataFromRequest } from '@/lib/meta/conversions';
import { safeEventId } from '@/lib/meta/event-id';
import { TERMS_VERSION } from '@/lib/public-legal';

type RegistrationData = { name?: unknown; email?: unknown; password?: unknown };

function validateRegistrationData(data: RegistrationData) {
  const errors: string[] = [];
  
  const { name, email, password } = data ?? {};
  
  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (name.trim().length > 50) {
    errors.push('Name must be less than 50 characters');
  }
  
  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const normalizedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (normalizedEmail.length > 254 || !emailRegex.test(normalizedEmail)) {
      errors.push('Invalid email format');
    }
    
  }
  
  // Password validation
  errors.push(...validatePassword(password));
  
  return errors;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    const ipRateLimitPassed = await registrationRateLimit(req, res);
    if (!ipRateLimitPassed) return;

    const { name, email, password, captchaId, captchaAnswer, acceptedTerms } = req.body ?? {};

    // Verify the security check server-side. The client only holds the challenge
    // id; the answer is validated against the server-held challenge, so scripted
    // signups cannot bypass it.
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ ok: false, error: 'Security check failed. Please solve the calculation again.' });
    }

    // Require (and record) Terms/Privacy acceptance — mandatory for a public SaaS.
    if (acceptedTerms !== true) {
      return res.status(400).json({ ok: false, error: 'You must accept the Terms and Privacy Policy to create an account.' });
    }

    // Enhanced validation
    const validationErrors = validateRegistrationData({ name, email, password });
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Validation failed',
        details: validationErrors 
      });
    }

    const emailRateLimitPassed = await emailRegistrationRateLimit(req, res);
    if (!emailRateLimitPassed) return;

    const _email = email.toString().trim().toLowerCase();
    const _name = name.toString().trim();
    const _password = password.toString();

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: _email, mode: 'insensitive' } },
      select: { id: true, email: true, createdAt: true }
    });
    
    if (existingUser) {
      // Don't reveal if email exists to prevent enumeration
      return res.status(400).json({ 
        ok: false, 
        error: 'Registration failed. Please check your information and try again.' 
      });
    }

    // Hash password with higher cost factor for better security
    const hash = await bcrypt.hash(_password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: _name,
        email: _email,
        password: hash,
        acceptedTermsAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        createdAt: true 
      },
    });

    // Same shape as the welcome email: reporting a conversion must never be able
    // to fail or delay a signup, and it sends nothing unless this request carried
    // consent for advertising measurement.
    void reportConversion(req, {
      eventName: 'CompleteRegistration',
      eventId: safeEventId(req.body?.metaEventId),
      eventSourceUrl: appUrl('/register'),
      userData: userDataFromRequest(req, user.email),
    }).catch(err => console.warn('[meta] registration conversion not reported:', err));

    // Fire-and-forget: a failed welcome email must never fail the signup.
    void sendWelcomeEmail({ to: user.email, name: user.name, signInUrl: appUrl('/login') })
      .then(result => {
        if (!result.ok) console.warn('Welcome email not sent:', result.error);
        else console.info(`Welcome email sent (resend id ${result.providerId ?? 'unknown'})`);
      })
      .catch(err => console.warn('Welcome email failed:', err));

    return res.status(201).json({
      ok: true, 
      user,
      message: 'Account created successfully. You can now sign in.' 
    });

  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(400).json({
        ok: false,
        error: 'Registration failed. Please check your information and try again.'
      });
    }
    console.error('Registration error:', err);
    
    // Don't expose internal errors
    return res.status(500).json({ 
      ok: false, 
      error: 'Registration failed. Please try again later.' 
    });
  }
}

export default withApiHandler(handler)
