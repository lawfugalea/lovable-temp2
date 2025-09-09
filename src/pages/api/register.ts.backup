import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { registrationRateLimit, emailRegistrationRateLimit } from '@/lib/rate-limiter';

// Enhanced validation
function validateRegistrationData(data: any) {
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    
    // Check for suspicious email patterns
    const suspiciousPatterns = [
      /^test\d*@/i,
      /^admin\d*@/i,
      /^user\d*@/i,
      /@(test|example|fake|temp)\./i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(email))) {
      errors.push('Please use a valid email address');
    }
  }
  
  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      errors.push('Password must contain uppercase, lowercase, and numbers');
    }
    
    // Check for common passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }
  }
  
  return errors;
}

// Check for suspicious registration patterns
function isSuspiciousRegistration(req: NextApiRequest, email: string) {
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';
  
  // Check for bot-like user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /php/i, /go-http/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Check for missing or suspicious referer
  if (!referer || referer.includes('localhost') || referer.includes('127.0.0.1')) {
    return true;
  }
  
  // Check for rapid-fire registrations (this would be caught by rate limiting, but good to log)
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    const ipRateLimitPassed = await registrationRateLimit(req, res);
    if (!ipRateLimitPassed) return;
    
    const emailRateLimitPassed = await emailRegistrationRateLimit(req, res);
    if (!emailRateLimitPassed) return;

    const { name, email, password } = req.body ?? {};

    // Enhanced validation
    const validationErrors = validateRegistrationData({ name, email, password });
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Validation failed',
        details: validationErrors 
      });
    }

    const _email = email.toString().trim().toLowerCase();
    const _name = name.toString().trim();
    const _password = password.toString();

    // Check for suspicious registration patterns
    if (isSuspiciousRegistration(req, _email)) {
      console.warn(`Suspicious registration attempt from IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress}, Email: ${_email}`);
      return res.status(400).json({ 
        ok: false, 
        error: 'Registration temporarily unavailable. Please try again later.' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email: _email },
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
        password: hash 
      },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        createdAt: true 
      },
    });

    // Log successful registration for monitoring
    console.log(`New user registered: ${_email} at ${new Date().toISOString()}`);

    return res.status(201).json({ 
      ok: true, 
      user,
      message: 'Account created successfully. You can now sign in.' 
    });

  } catch (err: any) {
    console.error('Registration error:', err);
    
    // Don't expose internal errors
    return res.status(500).json({ 
      ok: false, 
      error: 'Registration failed. Please try again later.' 
    });
  }
}
