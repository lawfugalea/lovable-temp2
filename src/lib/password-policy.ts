export function validatePassword(password: unknown): string[] {
  if (typeof password !== 'string') return ['Password is required'];

  const errors: string[] = [];
  if (password.length < 12) errors.push('Password must be at least 12 characters');
  if (password.length > 128) errors.push('Password must be less than 128 characters');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    errors.push('Password must contain uppercase, lowercase, and numbers');
  }

  const commonPasswords = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
  ]);
  if (commonPasswords.has(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  return errors;
}
