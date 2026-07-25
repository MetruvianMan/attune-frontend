/**
 * Supabase Client Configuration
 * 
 * For development, we hardcode the credentials here.
 * For production builds, these should come from environment variables or app config.
 */

// React Native URL polyfill for Supabase
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

// Hardcoded for development testing
// TODO: Move to secure environment variables for production
const SUPABASE_URL = 'https://qkvcwngwatfkhmjhzwvu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdmN3bmd3YXRma2htamh6d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjY5NTEsImV4cCI6MjEwMDM0Mjk1MX0.PkdkaX-lMkwlRLFLmb6dr5xhwAKkqGRkxS-KI98yPUs';

console.log('📡 Initializing Supabase Client');
console.log('   URL:', SUPABASE_URL);
console.log('   Anon Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration');
}

console.log('   Creating Supabase client...');
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});
console.log('✅ Supabase client created successfully');
