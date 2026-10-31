// ============================================================
// MONEY MOTION STUDIOS — app configuration
// ============================================================
// GO-LIVE: paste your Supabase project URL and anon (public) key
// below. While these are empty, the app runs in DEMO MODE and
// stores everything in this browser's localStorage instead.
// ============================================================

window.MM_CONFIG = {
  SUPABASE_URL: "https://mqucttxiwhdbsgzoitmd.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_8xSZSf0q9pYpgDUcPisDxA_lorBSEmS",

  // Demo-mode owner password for dashboard.html.
  // CHANGE THIS before sharing the demo link with anyone.
  // (Once Supabase is connected, the dashboard uses real Supabase
  // Auth email/password instead and this value is ignored.)
  DEMO_OWNER_PASSWORD: "moneymotion",

  // Fallback settings — used in demo mode, and as defaults before
  // the owner saves real values in the dashboard (Supabase
  // `settings` table). Edit them in the dashboard, not here.
  DEFAULT_SETTINGS: {
    cashapp_handle: "$LYNXUNLIMITEDMUSIC",
    venmo_link: "https://venmo.com/code?user_id=4643723270948240531&created=1792792682",
    chime_handle: "$Johnnie-Gannaway",
    live_on: "false",      // "true" when the live room is broadcasting
    playback_url: ""       // HLS (.m3u8) playback URL from Livepeer / Mux
  },

  // The studio's rate card. Prices are whole dollars.
  // Session services are booked in 5-hour blocks: price = base + block x blocks,
  // hours = 5 x blocks. (Studio Time: $150/block. Studio + Mix & Master adds
  // the flat $300 mix & master on top of the blocks.)
  SERVICES: [
    { id: "studio5",  name: "Studio Time — 5 Hours",        short: "Studio Time",              session: true,  base: 0,   block: 150, price: 150, blurb: "Free ROUGH mixing included" },
    { id: "mixmaster", name: "Mix & Master Only",           short: "Mix & Master Only",        session: false, price: 300, blurb: "Send your session, get a finished record" },
    { id: "full",     name: "Studio Time + Mix & Master",   short: "Studio Time + Mix & Master", session: true, base: 300, block: 150, price: 450, blurb: "5 hours in the booth plus full mix & master" }
  ],
  BOOKING_FEE: 50,

  STUDIO: {
    name: "MONEY MOTION STUDIOS",
    tagline: "From the block to the booth.",
    engineer: "KEYZ — Money Motion Engineer",
    phone1: "718-908-8466",
    phone2: "718-415-6422",
    address: "2 Saint Nicholas Ave, Brooklyn, NY 11237",
    ig_keyz: "https://www.instagram.com/keyzondabeatz37",
    ig_studio: "https://www.instagram.com/moneymotionstudiosnyc",
    tiktok: "https://www.tiktok.com/@keyzfrostbeatz"
  }
};
