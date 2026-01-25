import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vweolriluzhkiivqplzs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZW9scmlsdXpoa2lpdnFwbHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjc4MTYsImV4cCI6MjA4NDk0MzgxNn0.8nWl890rBmj1Jl7wfEh0gX3TCMxUQZHYlYEVPLcW76Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
