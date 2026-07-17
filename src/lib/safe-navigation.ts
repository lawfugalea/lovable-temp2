function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === "/") return ""
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`
  return withLeadingSlash.replace(/\/$/, "")
}

export function resolveSafeAppPath(
  candidate: string,
  origin: string,
  basePath = ""
): string {
  const normalizedBasePath = normalizeBasePath(basePath)
  const fallback = `${normalizedBasePath}/dashboard`

  if (
    !candidate.startsWith("/")
    || candidate.startsWith("//")
    || candidate.includes("\\")
    || /%5c/i.test(candidate)
  ) {
    return fallback
  }

  const prefixedCandidate = normalizedBasePath
    && candidate !== normalizedBasePath
    && !candidate.startsWith(`${normalizedBasePath}/`)
      ? `${normalizedBasePath}${candidate}`
      : candidate

  try {
    const resolved = new URL(prefixedCandidate, origin)
    const isInsideBasePath = !normalizedBasePath
      || resolved.pathname === normalizedBasePath
      || resolved.pathname.startsWith(`${normalizedBasePath}/`)

    if (resolved.origin !== origin || !isInsideBasePath) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}
