import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-config'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const isAdmin = isAdminEmail(token?.email as string | undefined)

    if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/debug')) {
      if (!token) return NextResponse.redirect(new URL(`${basePath}/`, req.url))
      if (!isAdmin) return NextResponse.redirect(new URL(`${basePath}/dashboard`, req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if ((token as any)?.invalidated === true) return false
        if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/debug')) {
          return isAdminEmail(token?.email as string | undefined)
        }
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/debug/:path*',
    '/debug',
    '/dashboard/:path*',
    '/shopping/:path*',
    '/finances/:path*',
    '/banking/:path*',
    '/medicine/:path*',
    '/notes/:path*',
    '/notes',
    '/settings/:path*',
    '/household/:path*',
  ],
}
