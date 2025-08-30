import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { to, name } = await request.json();

  await sendEmail({
    to,
    subject: "Welcome to Limetto!",
    html: `<h1>Hello ${name},</h1><p>Welcome to Limetto!</p>`,
  });

  return NextResponse.json({ success: true });
}
