import { createClient } from "@supabase/supabase-js";

// Your actual Supabase project credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://opxggqwvyturntszaiti.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weWdncXd2eXR1bnRzdHphaXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTk5MzEsImV4cCI6MTc3NjI4MzMzMX0.YZTdzhEUvsOpam1jVJyuma6iaeyJ384N28nFWoamDao';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable URL detection for our app
    flow: 'implicit', // Use implicit flow for immediate auth
    debug: true, // Enable debug to see what's happening
  },
});
