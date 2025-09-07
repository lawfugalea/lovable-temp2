// Fully disable middleware in dev to eliminate redirect loops during debugging
export const config = { matcher: [] };

export default function noop() {}
