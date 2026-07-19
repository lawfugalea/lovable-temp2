/**
 * Password policy, aligned with NIST 800-63B: length is what matters, so
 * require a reasonable minimum and block trivially guessable passwords, but
 * impose no composition rules (mixed case / digits / symbols).
 */
export function validatePassword(password: unknown): string[] {
  if (typeof password !== 'string') return ['Password is required'];

  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (password.length > 128) errors.push('Password must be less than 128 characters');

  const commonPasswords = new Set([
    'password', '12345678', '123456789', '1234567890', 'qwertyui',
    'password1', 'password123', 'iloveyou', 'sunshine', 'welcome1',
    'letmein1', 'football', 'baseball', 'princess', 'trustno1',
    'clankeep', 'clankeep1',
  ]);
  if (commonPasswords.has(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password');
  }
  return errors;
}
