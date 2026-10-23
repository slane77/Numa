// ============================================================================
//  Urgent Nursing Outreach Manager — Configuration
// ============================================================================
//
//  Replace the two YOUR_*_HERE values below with your actual Supabase project
//  details. Find them at: Supabase Dashboard → Project Settings → API
//
//    SUPABASE_URL       = "Project URL"           (e.g. https://abcdefg.supabase.co)
//    SUPABASE_ANON_KEY  = "anon public" key       (long string starting with "eyJ...")
//
//  IMPORTANT:
//  - Both values are SAFE to commit to a public GitHub repo. The database is
//    protected by Row Level Security policies, not by key secrecy.
//  - NEVER paste the "service_role" key here. That one bypasses all security
//    and would expose all your data publicly. Only use anon/public.
//
// ============================================================================

// This branch (the Day Webster Compliance Portal) points at the dedicated
// "Numa" Supabase project — SEPARATE from the live outreach project
// (Urgent Staffing Outreach), which is untouched.
window.CONFIG = {
  SUPABASE_URL: 'https://heugpopauuhkrimdfrep.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_9ehpkWFt9wtqVf3DfkMuEA_7ZTK3qd9',

  CHAT_ENABLED: true,

  // Managed Services (msp.html / js/msp.js). The msp_* tables currently live
  // on the Urgent Staffing Outreach project. To move them onto the Numa
  // project, run supabase/msp_schema.sql there and point these two values at
  // the Numa URL/key above.
  MSP_SUPABASE_URL: 'https://udttpnaenmyxviuiwxqw.supabase.co',
  MSP_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkdHRwbmFlbm15eHZpdWl3eHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzAwODIsImV4cCI6MjA5NDc0NjA4Mn0.b7zeFYbNPSo7WjFu6-VFhMVelD2g1ja9m3af0Jb5geU'
};
