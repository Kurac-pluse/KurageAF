import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL; // SupabaseのプロジェクトURL
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY; // SupabaseのAPIキー
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
