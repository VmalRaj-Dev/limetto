export interface Profile {
  id: string
  name: string
  email: string
  category: string
  subscribed_at: string | null
  trial_ends_at: string | null
  created_at: string
  has_ever_trialed: Date;
  subscription_status: string;
  chosen_category_id: string
}

export interface Lead {
  id: string
  title: string
  description: string
  category: string
  link: string
  created_at: string
}