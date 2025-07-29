import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/utils/supabase/server'; // Assuming your helper is correct
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = await createServer(); // The official helper is synchronous

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the profile to get the Dodo Payments Customer ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('dodopayments_customer_id') // The column name in your DB
    .eq('id', user.id)
    .single();

  console.log('-----> Dodo Customer ID from DB:', profile?.dodopayments_customer_id);
  if (profileError) {
    console.error('Supabase profile fetch error:', profileError.message);
  }

  // Check if the customer ID exists
  if (!profile?.dodopayments_customer_id) {
    return NextResponse.json(
      { error: 'Customer ID not found for this user.' },
      { status: 400 }
    );
  }

  // Dynamically create the return URL
  const origin = headers().get('origin') || 'http://localhost:3000';
  const returnUrl = `${origin}/dashboard`;

  try {
    const dodoRes = await fetch('https://api.dodopayments.com/v1/portal/session', {
      method: 'POST',
      headers: {
        // Ensure DODO_API_KEY is set in your .env.local
        Authorization: `Bearer ${process.env.DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // FIX: Use the correct property name from the profile object
        customer: profile.dodopayments_customer_id,
        // FIX: Use the dynamic return URL
        return_url: returnUrl,
      }),
    });

    const data = await dodoRes.json();
    if (!dodoRes.ok) {
      console.error('Dodo Payments API Error:', data);
      return NextResponse.json(
        { error: 'Failed to create portal session.', details: data },
        { status: dodoRes.status }
      );
    }

    // Success: return the session data from Dodo Payments
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Internal Server Error:', e.message);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}