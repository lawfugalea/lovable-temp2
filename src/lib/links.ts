// src/lib/links.ts
export function appUrl(path = "/") {
  const base =
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return new URL(path, base).toString();
}
