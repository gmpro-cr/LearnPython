/* PyQuest — cross-device progress, configuration.
 *
 * Leave these blank and nothing changes: no sign-in button appears, progress
 * stays in localStorage on this device, and the site behaves exactly as it did
 * before sync existed.
 *
 * To switch it on, follow docs/supabase-setup.md and paste the two values from
 * your Supabase project (Settings → API):
 *
 *   url      https://<project-ref>.supabase.co
 *   anonKey  the "anon" / "publishable" key
 *
 * The anon key is meant to be public — it ships in the page of every Supabase
 * site. What protects a learner's row is Row Level Security, which the setup
 * SQL turns on. Never paste the service_role key here; it bypasses RLS.
 */

const SUPABASE_CONFIG = {
  url: "https://lxlbbzrntlfbukqiivoj.supabase.co",
  anonKey: "sb_publishable_O7cZ0pkydHaweltOCRAIJQ_MZmUkSmt",
};
