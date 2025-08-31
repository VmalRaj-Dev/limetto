import { NextResponse } from 'next/server';
import { emailAutomation } from '@/lib/email-automation';

export async function POST(request: Request) {
  try {
    // Verify the request is from a cron job or authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send payment reminders
    await emailAutomation.sendPaymentReminders();

    return NextResponse.json({ 
      success: true, 
      message: 'Payment reminders sent successfully' 
    });
  } catch (error) {
    console.error('Payment reminders cron job failed:', error);
    return NextResponse.json(
      { error: 'Failed to send payment reminders' },
      { status: 500 }
    );
  }
}

// Allow GET for testing purposes
export async function GET() {
  return NextResponse.json({ 
    message: 'Payment reminders endpoint is working. Use POST to trigger.' 
  });
}
