import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    
    // Debug logging for development
    console.log(`[Middleware] Path: ${pathname}, Has Token: ${!!token}, Email: ${token?.email || 'none'}`);
    
    // If no token and trying to access protected route, redirect immediately
    if (!token && pathname !== '/login' && pathname !== '/register' && pathname !== '/' && pathname !== '/landing') {
      console.log(`[Middleware] Redirecting ${pathname} to /login - no token`);
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Admin route protection
    if (pathname.startsWith('/admin')) {
      const isAdmin = token?.email === 'lawfinuu@gmail.com';
      if (!isAdmin) {
        console.log(`[Middleware] Redirecting ${pathname} to /dashboard - not admin`);
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        console.log(`[Auth Callback] Path: ${pathname}, Has Token: ${!!token}`);
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/login',
          '/register', 
          '/landing',
          '/privacy',
          '/terms',
          '/sitemap.xml'
        ];
        
        // Check if it's a public route
        if (publicRoutes.includes(pathname)) {
          console.log(`[Auth Callback] Public route: ${pathname}`);
          return true;
        }
        
        // API auth routes are always allowed
        if (pathname.startsWith('/api/auth')) {
          console.log(`[Auth Callback] API auth route: ${pathname}`);
          return true;
        }
        
        // All other routes require authentication
        const hasAuth = !!token;
        console.log(`[Auth Callback] Protected route ${pathname}, authorized: ${hasAuth}`);
        return hasAuth;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    // Explicitly match protected routes
    '/notes/:path*',
    '/notes',
    '/dashboard/:path*', 
    '/dashboard',
    '/shopping/:path*',
    '/shopping',
    '/medicine/:path*',
    '/medicine',
    '/finances/:path*',
    '/finances',
    '/settings/:path*',
    '/settings',
    '/household/:path*',
    '/household',
    '/admin/:path*',
    '/admin',
    '/ModernDashboard',
    '/ModernSettings', 
    '/ModernShopping',
    '/overview',
  ]
};
