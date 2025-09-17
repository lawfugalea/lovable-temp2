import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.email === 'lawfinuu@gmail.com';
    
    // Protect admin routes with special admin-only logic
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to admin routes only for admin user
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.email === 'lawfinuu@gmail.com';
        }
        // For other routes, allow if token exists
        return !!token;
      },
    },
    pages: {
      signIn: '/login', // Redirect to login page when unauthorized
    },
  }
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/shopping/:path*',
    '/finances/:path*',
    '/medicine/:path*',
    '/settings/:path*',
    '/household/:path*',
    '/notes/:path*',
  ]
};
