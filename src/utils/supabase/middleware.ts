import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Configuration object for paths
const PATH_CONFIG = {
  publicPaths: ['/', '/login', '/signup', '/forgot-password', '/reset-password'],
  protectedPaths: ['/dashboard', '/profile', '/settings']
}

export async function updateSession(request: NextRequest) {
  // Create an initial response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies on the request
            request.cookies.set(name, value)
            
            // Update the response cookies
            supabaseResponse = NextResponse.next({
              request,
            })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Fetch user information
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get current path
  const currentPath = request.nextUrl.pathname;

  // Check path types
  const isPublicPath = PATH_CONFIG.publicPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  const isProtectedPath = PATH_CONFIG.protectedPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );

  // Debugging log (remove in production)
  console.log('Middleware Check:', {
    currentPath,
    isPublicPath,
    isProtectedPath,
    userExists: !!user
  });

  // If not logged in and trying to access protected path
  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url);
    
    // Optional: Store the intended destination for post-login redirect
    if (currentPath !== '/login') {
      redirectUrl.searchParams.set('redirectedFrom', currentPath);
    }
    
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in and trying to access authentication pages
  if (user && (currentPath.startsWith('/login') || currentPath.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For all other cases, continue with the original response
  return supabaseResponse;
}

// Matcher to apply middleware selectively
export const config = {
  matcher: [
    // Apply to all routes except these
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*|auth/confirm).*)',
  ],
}