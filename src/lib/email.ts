import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from = "noreply@auth.limetto.com",
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
