import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ must be service role
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  // 1. Create user and generate signup confirmation link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });

  console.log("Generated signup link:", data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const confirmationUrl = data?.properties?.action_link;

  // 2. Send custom email with Resend
  await resend.emails.send({
    from: "no-reply@auth.limetto.com", // must be your verified domain
    to: email,
    subject: "Welcome to Limetto! Confirm your email",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Welcome, ${name || "there"} 🎉</h1>
        <p>Thanks for signing up for <b>Limetto</b>!</p>
        <p>Please confirm your email address by clicking the button below:</p>
        <p>
          <a href="${confirmationUrl}"
            style="display:inline-block; background:#4f46e5; color:#fff; 
                   padding:12px 20px; border-radius:8px; text-decoration:none; 
                   font-weight:bold;">
            Confirm Email
          </a>
        </p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
