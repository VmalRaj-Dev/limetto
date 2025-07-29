import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead } from '@/types'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    async function loadLeads() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()

      const now = new Date()
      const trialExpired = profile.trial_ends_at && new Date(profile.trial_ends_at) < now
      const isSubscribed = !!profile.subscribed_at

      if (!isSubscribed && trialExpired) return setStatus('Trial expired. Subscribe to continue.')

      const { data } = await supabase.from('leads').select('*').eq('category', profile.category)
      setLeads(data || [])
    }
    loadLeads()
  }, [])

  return (
    <div>
      <h2>Your Leads</h2>
      {status && !leads.length && <p>{status}</p>}
      <ul>
        {leads.map((lead) => (
          <li key={lead.id}>{lead.title} - {lead.category}</li>
        ))}
      </ul>
    </div>
  )
}