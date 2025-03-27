import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mxlfmlizdovfofpgibzt.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bGZtbGl6ZG92Zm9mcGdpYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNjg4NzksImV4cCI6MjA1ODY0NDg3OX0.krzmr7xZNtaLRfRrv5hYzJyJOi5hM-XxtsXG63tK1ws";

export const supabase = createClient(supabaseUrl, supabaseKey);
