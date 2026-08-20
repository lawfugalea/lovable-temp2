// src/lib/links.ts
export function appUrl(path = "/") {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  const normalizedBase = `${base.replace(/\/$/, '')}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
}
