// Lancé automatiquement au build (voir "buildCommand" dans vercel.json).
// Se connecte à Postgres et crée les tables abk_ngl_* si absentes. Idempotent.

const { Client } = require("pg");
const crypto = require("crypto");

const SCHEMA = `
create table if not exists abk_ngl_public_slugs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titre text default 'Envoie-moi un message',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists abk_ngl_access_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  label text,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists abk_ngl_messages (
  id uuid primary key default gen_random_uuid(),
  slug text references abk_ngl_public_slugs(slug) on delete set null,
  contenu text not null,
  ip_adresse text,
  user_agent text,
  navigateur text,
  moteur_navigateur text,
  os text,
  type_appareil text,
  modele_appareil text,
  pays text,
  ville text,
  referer text,
  langue text,
  is_lu boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_abk_ngl_messages_created_at on abk_ngl_messages (created_at desc);
create index if not exists idx_abk_ngl_messages_slug on abk_ngl_messages (slug);
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("\n[init-db] DATABASE_URL absent — création des tables ignorée.\n");
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query(SCHEMA);
    console.log("[init-db] Tables abk_ngl_* vérifiées/créées avec succès.");

    const slug = process.env.PUBLIC_SLUG || "contact";
    const { rows: slugRows } = await client.query("select 1 from abk_ngl_public_slugs where slug = $1", [slug]);
    if (slugRows.length === 0) {
      await client.query("insert into abk_ngl_public_slugs (slug) values ($1)", [slug]);
      console.log(`[init-db] Slug public créé : /m?to=${slug}`);
    }

    const { rows: linkRows } = await client.query("select token from abk_ngl_access_links limit 1");
    if (linkRows.length === 0) {
      const token = crypto.randomBytes(24).toString("hex");
      await client.query("insert into abk_ngl_access_links (token, label) values ($1, $2)", [token, "accès principal"]);
      console.log("\n==================================================");
      console.log("[init-db] Token d'accès généré (copie-le maintenant) :");
      console.log(token);
      console.log("Dashboard : /dashboard?token=" + token);
      console.log("==================================================\n");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[init-db] Échec de l'initialisation :", err.message);
});
