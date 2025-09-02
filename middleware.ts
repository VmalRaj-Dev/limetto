import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Configuration object for paths
const PATH_CONFIG = {
  publicPaths: ['/', '/login', '/signup', '/forgot-password', '/reset-password'],
  subscriptionExemptPaths: ['/subscribe', '/api/checkout/subscription'],
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
  // const isPublicPath = PATH_CONFIG.publicPaths.some(path => 
  //   currentPath === path || currentPath.startsWith(`${path}/`)
  // );
  const isSubscriptionExemptPath = PATH_CONFIG.subscriptionExemptPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  const isProtectedPath = PATH_CONFIG.protectedPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );

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

  // Check subscription status for logged-in users on protected paths
  if (user && isProtectedPath && !isSubscriptionExemptPath) {
    try {
      // Get the user's profile to check subscription status
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile in middleware:', error.message);
        // If there's an error fetching the profile, we might want to err on the side of caution
        return NextResponse.redirect(new URL('/subscribe', request.url));
      }

      // Check if user has active subscription or valid trial
      const isActive = profile?.subscription_status === 'active';
      const isTrialing = profile?.subscription_status === 'trialing';
      
      
      // For trialing status, check if trial is still valid
      const trialIsValid = isTrialing && 
        profile?.trial_ends_at && 
        new Date(profile.trial_ends_at) > new Date();

      // Redirect to subscribe page if not active or not in valid trial period
      if (!isActive && !trialIsValid) {
        return NextResponse.redirect(new URL('/subscribe', request.url));
      }
    } catch (err) {
      console.error('Middleware subscription check error:', err);
      // On error, redirect to subscribe page as a safety measure
      return NextResponse.redirect(new URL('/subscribe', request.url));
    }
  }

  // For all other cases, continue with the original response
  return supabaseResponse;
}

// Matcher to apply middleware selectively
export const config = {
  matcher: [
    // Apply to all routes except these
    '/((?!_next/static|_next/image|favicon.svg|api/webhook|.*\\..*|auth/confirm).*)',
  ],
}