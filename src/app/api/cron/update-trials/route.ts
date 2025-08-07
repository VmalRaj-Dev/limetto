import { createServerClient } from '@/utils/supabase/serverClient'

export async function GET() {
  // Verify this is called by your scheduler/cron system
  
  const supabase = createServerClient();
  
  // Find all expired trials
  const { data: expiredTrials } = await supabase
    .from('profiles')
    .select('id')
    .eq('subscription_status', 'trialing')
    .lt('trial_ends_at', new Date().toISOString());

    console.log(expiredTrials)
  
  if (expiredTrials?.length) {
    // Update all expired trials
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'trial_ended' })
      .in('id', expiredTrials.map(profile => profile.id));
      
    if (error) {
      console.error('Failed to update expired trials:', error);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return Response.json({ 
      success: true, 
      updated: expiredTrials.length 
    });
  }
  
  return Response.json({ success: true, updated: 0 });
}