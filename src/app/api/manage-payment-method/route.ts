import { NextResponse } from 'next/server';
import { createServer } from '@/utils/supabase/server'; // Assuming your helper is correct
// import { headers } from 'next/headers';

export async function POST() {
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
  // const headersList = await headers();
  // const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_BASE_URL;
  // const returnUrl = `${origin}/dashboard`;

  // Use the correct test or live endpoint
  // const baseUrl =
  //   process.env.NODE_ENV === 'production'
  //     ? 'https://live.dodopayments.com'
  //     : 'https://test.dodopayments.com';

       const baseUrl ='https://test.dodopayments.com';

  const customerId = profile.dodopayments_customer_id;

  try {
    const dodoRes = await fetch(
      `${baseUrl}/customers/${customerId}/customer-portal/session`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DODO_API_KEY_TEST}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if there is a response body before parsing
    let data = null;
    const text = await dodoRes.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('Failed to parse Dodo Payments API response as JSON:', text, err);
      data = {};
    }

    if (!dodoRes.ok) {
      return NextResponse.json(
        { error: 'Failed to create portal session.', details: data },
        { status: dodoRes.status }
      );
    }

    // The portal link is in data.link
    return NextResponse.json({ session_url: data.link });
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('Internal Server Error:', e.message);
    } else {
      console.error('Internal Server Error:', e);
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}