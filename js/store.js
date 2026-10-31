// ============================================================
// MONEY MOTION STUDIOS — data layer
// One API, two backends:
//  - Supabase (when URL + anon key are set in js/config.js)
//  - localStorage DEMO MODE (when they are empty)
// Pages only ever call MMStore.* — never Supabase/localStorage
// directly — so going live is just pasting keys into config.js.
// ============================================================

(function () {
  const cfg = window.MM_CONFIG;
  const DEMO = !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY;

  let sb = null;
  if (!DEMO && window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  // ---------- small helpers ----------
  const LS = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("mm_" + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      localStorage.setItem("mm_" + key, JSON.stringify(value));
    }
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function newBookingNumber(existing) {
    let n;
    do {
      n = "MM-" + String(Math.floor(100000 + Math.random() * 900000));
    } while (existing && existing.some(b => b.booking_number === n));
    return n;
  }

  // ---------- settings ----------
  async function getSettings() {
    if (DEMO) {
      return Object.assign({}, cfg.DEFAULT_SETTINGS, LS.get("settings", {}));
    }
    const out = Object.assign({}, cfg.DEFAULT_SETTINGS);
    const { data, error } = await sb.from("settings").select("key,value");
    if (!error && data) data.forEach(r => { out[r.key] = r.value; });
    return out;
  }

  async function saveSettings(patch) {
    if (DEMO) {
      const cur = LS.get("settings", {});
      LS.set("settings", Object.assign({}, cur, patch));
      return;
    }
    const rows = Object.keys(patch).map(k => ({ key: k, value: String(patch[k]) }));
    const { error } = await sb.from("settings").upsert(rows, { onConflict: "key" });
    if (error) throw error;
  }

  // ---------- bookings ----------
  async function createBooking(input) {
    if (DEMO) {
      const all = LS.get("bookings", []);
      const booking = Object.assign({}, input, {
        id: uuid(),
        booking_number: newBookingNumber(all),
        status: "Pending payment",
        created_at: new Date().toISOString()
      });
      all.push(booking);
      LS.set("bookings", all);
      return booking;
    }
    // Supabase: generate a number, retry once or twice on the
    // (very unlikely) unique-collision.
    let lastErr = null;
    let stripSessionCols = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = Object.assign({}, input, {
        booking_number: newBookingNumber(null),
        status: "Pending payment"
      });
      if (stripSessionCols) {
        // The hours/ends_at columns are not in the table (yet): keep the
        // booking working — drop the columns and fold the hours into the
        // service label so the dashboard + receipt still show them.
        delete row.hours;
        delete row.ends_at;
        if (input.hours) row.service = input.service + " (" + input.hours + " hrs)";
      }
      const { data, error } = await sb.from("bookings").insert(row).select().single();
      if (!error) return data;
      lastErr = error;
      if (!stripSessionCols && /hours|ends_at|column/i.test(error.message || "")) {
        stripSessionCols = true;
        continue;
      }
      if (!/duplicate|unique/i.test(error.message || "")) break;
    }
    throw lastErr;
  }

  async function getBookingByNumber(number) {
    if (DEMO) {
      return LS.get("bookings", []).find(b => b.booking_number === number) || null;
    }
    const { data, error } = await sb.from("bookings")
      .select("*").eq("booking_number", number).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listBookings() {
    if (DEMO) {
      return LS.get("bookings", []).slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { data, error } = await sb.from("bookings")
      .select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function setBookingStatus(booking, status) {
    if (DEMO) {
      const all = LS.get("bookings", []);
      const i = all.findIndex(b => b.booking_number === booking.booking_number);
      if (i >= 0) { all[i].status = status; LS.set("bookings", all); }
      return;
    }
    const { error } = await sb.from("bookings")
      .update({ status: status }).eq("booking_number", booking.booking_number);
    if (error) throw error;
  }

  // ---------- chat ----------
  async function listChat(room) {
    if (DEMO) {
      return LS.get("chat_" + room, []).slice(-100);
    }
    const { data, error } = await sb.from("chat_messages")
      .select("*").eq("room", room)
      .order("created_at", { ascending: true }).limit(100);
    if (error) throw error;
    return data || [];
  }

  async function sendChat(room, sender, body) {
    const msg = { id: uuid(), room: room, sender: sender, body: body, created_at: new Date().toISOString() };
    if (DEMO) {
      const all = LS.get("chat_" + room, []);
      all.push(msg);
      LS.set("chat_" + room, all.slice(-200));
      return msg;
    }
    const { data, error } = await sb.from("chat_messages")
      .insert({ room: room, sender: sender, body: body }).select().single();
    if (error) throw error;
    return data;
  }

  // Live updates when possible; returns an unsubscribe function.
  // Demo mode: polls localStorage (also catches other tabs via
  // the "storage" event under the hood of the interval re-read).
  function subscribeChat(room, onMessages) {
    if (DEMO) {
      const t = setInterval(async () => onMessages(await listChat(room)), 1500);
      return () => clearInterval(t);
    }
    const channel = sb.channel("chat_" + room)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: "room=eq." + room },
        async () => onMessages(await listChat(room)))
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }

  function subscribeSettings(onChange) {
    if (DEMO) {
      const t = setInterval(onChange, 3000);
      return () => clearInterval(t);
    }
    const channel = sb.channel("mm_settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, onChange)
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }

  // ---------- owner auth ----------
  async function ownerSignedIn() {
    if (DEMO) return sessionStorage.getItem("mm_demo_owner") === "1";
    const { data } = await sb.auth.getSession();
    return !!(data && data.session);
  }

  async function ownerSignIn(email, password) {
    if (DEMO) {
      if (password === cfg.DEMO_OWNER_PASSWORD) {
        sessionStorage.setItem("mm_demo_owner", "1");
        return true;
      }
      return false;
    }
    const { error } = await sb.auth.signInWithPassword({ email: email, password: password });
    if (error) throw error;
    return true;
  }

  async function ownerSignOut() {
    if (DEMO) { sessionStorage.removeItem("mm_demo_owner"); return; }
    await sb.auth.signOut();
  }

  async function ownerResetPassword(email) {
    if (DEMO) throw new Error("Demo mode has no email accounts - use the demo owner password.");
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    return true;
  }

  async function ownerUpdatePassword(newPassword) {
    if (DEMO) throw new Error("Demo mode has no email accounts.");
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  }

  function onPasswordRecovery(fn) {
    if (DEMO || !sb) return;
    sb.auth.onAuthStateChange(function (event) {
      if (event === "PASSWORD_RECOVERY") fn();
    });
  }

  // ---------- demo banner ----------
  function showDemoNotice() {
    if (!DEMO) return;
    if (document.getElementById("mm-demo-bar")) return;
    const bar = document.createElement("div");
    bar.id = "mm-demo-bar";
    bar.className = "demo-bar";
    bar.textContent = "Demo mode — connect Supabase to go live. Data is stored only in this browser.";
    document.body.insertBefore(bar, document.body.firstChild);
  }

  window.MMStore = {
    DEMO: DEMO,
    getSettings, saveSettings,
    createBooking, getBookingByNumber, listBookings, setBookingStatus,
    listChat, sendChat, subscribeChat, subscribeSettings,
    ownerSignedIn, ownerSignIn, ownerSignOut, ownerResetPassword, ownerUpdatePassword, onPasswordRecovery,
    showDemoNotice
  };
})();
