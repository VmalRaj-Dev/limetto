import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, name } = await request.json();

  // You can customize the email HTML and subject as needed
  await resend.emails.send({
    from: "noreply@yourdomain.com", // Use your verified sender
    to: email,
    subject: "Welcome to Limetto! Confirm your email",
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for signing up for Limetto.</p>
      <p>Please check your inbox for a confirmation email from our system to activate your account.</p>
      <p>If you have any questions, reply to this email.</p>
    `,
  });

  return NextResponse.json({ success: true });
}
