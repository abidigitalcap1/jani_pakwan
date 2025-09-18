import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhppvlhncluhmlrvjuqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpocHB2bGhuY2x1aG1scnZqdXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTYyOTMsImV4cCI6MjA3MzY3MjI5M30.4GkkrIuVtKPu2hT-JYWEVaIp_FyhEmMKD1krNHjqxSc';

export const supabase = createClient(supabaseUrl, supabaseKey);