import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase-ის გარემოს ცვლადები ვერ მოიძებნა. დარწმუნდით რომ .env.local ფაილში (ან Vercel-ის Environment Variables-ში) ' +
      'მითითებულია NEXT_PUBLIC_SUPABASE_URL და NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);