import { dodopayments } from "@/lib/dodopayments";
import { NextResponse } from "next/server";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { createClient } from "@/utils/supabase/client";

countries.registerLocale(enLocale);

const DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID =
  process.env.DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID;

export const POST = async (request: Request) => {
  try {
    if (!DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID) {
      throw new Error(
        "Missing DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID env var"
      );
    }

    const body = await request.json();
    const { supabaseUserId, supabaseCategoryId, email, name, billing } = body;

    if (
      !supabaseUserId ||
      !supabaseCategoryId ||
      !email ||
      !name ||
      !billing ||
      !billing.country
    ) {
      return NextResponse.json(
        { error: "Missing required signup or billing fields" },
        { status: 400 }
      );
    }

    const countryCode = countries.getAlpha2Code(billing.country, "en");
    if (!countryCode) {
      return NextResponse.json(
        { error: `Invalid country: ${billing.country}` },
        { status: 400 }
      );
    }

    const supabase = createClient();

    let dodopaymentsCustomerId: string | undefined;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dodopayments_customer_id")
      .eq("id", supabaseUserId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 means "no rows found"
      throw profileError;
    }

    if (profile?.dodopayments_customer_id) {
      dodopaymentsCustomerId = profile.dodopayments_customer_id;
      console.log("Existing dodopaymentsCustomerId:", dodopaymentsCustomerId);
    } else {
      const customerRes = await dodopayments.customers.create({
        email,
        name,
      });
      dodopaymentsCustomerId = customerRes.customer_id;
      console.log(
        "New dodopaymentsCustomerId created:",
        dodopaymentsCustomerId
      );
      await supabase
        .from("profiles")
        .update({ dodopayments_customer_id: dodopaymentsCustomerId })
        .eq("id", supabaseUserId);
    }

    console.log(
      "dodopaymentsCustomerId before subscription creation:",
      dodopaymentsCustomerId
    );
    if (!dodopaymentsCustomerId) {
      throw new Error("Failed to resolve dodopaymentsCustomerId");
    }
    const subscriptionResponse = await dodopayments.subscriptions.create({
      billing: {
        ...billing,
        country: countryCode,
      },
      customer: {
        email,
        name,
        customer_id: dodopaymentsCustomerId,
      },
      payment_link: true,
      product_id: DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID,
      quantity: 1,
      return_url: process.env.NEXT_PUBLIC_BASE_URL,
      metadata: {
        supabase_user_id: supabaseUserId,
        supabase_category_id: supabaseCategoryId,
        dodopayments_customer_id: dodopaymentsCustomerId, // <--- ADD THIS LINE
      },
    });

    console.log(
      "Subscription creation response (metadata part):",
      subscriptionResponse.metadata
    );

    return NextResponse.json(subscriptionResponse);
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create subscription", details: msg },
      { status: 500 }
    );
  }
};
