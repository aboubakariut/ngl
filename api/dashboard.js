const { createClient } = require("@supabase/supabase-js");

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis.");
  return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "méthode non supportée" });

  const { token } = req.body || {};
  if (!token) return res.status(200).json({ valid: false });

  const supabase = db();
  const { data: link } = await supabase.from("abk_ngl_access_links").select("is_active, expires_at").eq("token", token).single();
  const valid = !!link && link.is_active && (!link.expires_at || new Date(link.expires_at) > new Date());
  if (!valid) return res.status(200).json({ valid: false });

  const { data: messages } = await supabase.from("abk_ngl_messages").select("*").order("created_at", { ascending: false });
  return res.status(200).json({ valid: true, messages: messages || [] });
};
