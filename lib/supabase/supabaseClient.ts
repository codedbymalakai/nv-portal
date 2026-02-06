// Import the function used to connect to supabase
import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_ means it's allowed to be used in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// This key lets the frontend talk to supabase securely
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Creates a supabase client using project details
// App will use this object to log users in and query data.
// Export makes this variable available to other files
export const supabase = createClient(supabaseUrl, supabaseAnonKey)