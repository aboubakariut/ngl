const { createClient } = require("@supabase/supabase-js");
const { UAParser } = require("ua-parser-js");

const MAX_LEN = 800;

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function isAuthorized(supabase, token) {
  if (!token) return false;
  const { data } = await supabase.from("abk_ngl_access_links").select("is_active, expires_at").eq("token", token).single();
  if (!data || !data.is_active) return false;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
  return true;
}

module.exports = async (req, res) => {
  const supabase = db();

  if (req.method === "POST") {
    const slug = (req.body?.slug || "").trim();
    const contenu = (req.body?.contenu || "").trim();
    if (!slug || !contenu) return res.status(400).json({ error: "slug et contenu requis" });
    if (contenu.length > MAX_LEN) return res.status(400).json({ error: "message trop long" });

    const { data: slugRow } = await supabase.from("abk_ngl_public_slugs").select("slug, is_active").eq("slug", slug).single();
    if (!slugRow || !slugRow.is_active) return res.status(404).json({ error: "lien invalide" });

    const ua = req.headers["user-agent"] || "";
    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || null;

    let pays = null;
    let ville = null;
    if (ip && process.env.IPGEO_API_KEY) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/?key=${process.env.IPGEO_API_KEY}`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          pays = geo.country_name ?? null;
          ville = geo.city ?? null;
        }
      } catch {}
    }

    const { error } = await supabase.from("abk_ngl_messages").insert({
      slug,
      contenu,
      ip_adresse: ip,
      user_agent: ua || null,
      navigateur: browser.name ? `${browser.name} ${browser.version ?? ""}`.trim() : null,
      moteur_navigateur: parser.getEngine().name || null,
      os: os.name ? `${os.name} ${os.version ?? ""}`.trim() : null,
      type_appareil: device.type || "desktop",
      modele_appareil: device.model || null,
      referer: req.headers["referer"] || null,
      langue: (req.headers["accept-language"] || "").split(",")[0] || null,
      pays,
      ville,
    });

    if (error) return res.status(500).json({ error: "échec de l'enregistrement" });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "PATCH") {
    const { id, token } = req.body || {};
    if (!id || !(await isAuthorized(supabase, token))) return res.status(401).json({ error: "non autorisé" });
    const { error } = await supabase.from("abk_ngl_messages").update({ is_lu: true }).eq("id", id);
    if (error) return res.status(500).json({ error: "échec" });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "méthode non supportée" });
};
