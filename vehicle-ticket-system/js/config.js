// Supabase Dashboard -> Project Settings -> API  (anon/public key only, never service_role)
const SUPABASE_URL = "https://arzlbvqxuxgwpfflhmmp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyemxidnF4dXhnd3BmZmxobW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDgwNzYsImV4cCI6MjEwODc4NDA3Nn0.P3DoW7hKuwzl3WLxv6uSTqC8mAznUTlThVOHZkIZq6Q";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
