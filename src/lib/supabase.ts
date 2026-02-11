import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sdtzojbaoidqhdtwxmvy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdHpvamJhb2lkcWhkdHd4bXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjA3NzUsImV4cCI6MjA4NjMzNjc3NX0.lUEawvputSAREX0vAl0Q__9G7eoubpBfQSRI33H0kSo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'remesapro-auth',
    storage: localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
