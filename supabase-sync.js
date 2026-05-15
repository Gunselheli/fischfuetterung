(() => {
  const SUPABASE_URL = "https://dkgwiozbqnbxfdcrgrvv.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3dpb3picW5ieGZkY3JncnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5OTA3ODYsImV4cCI6MjA5MzU2Njc4Nn0.wonAJ8uORcCVhD5KIN6X7ExEhD2z92GMuw_IiMKDDx0";
  const TABLE = "app_state";
  const STATE_ID = "main";
  const statusEl = document.querySelector("#syncStatus");
  const originalSaveState = saveState;

  const sync = {
    ready: false,
    applyingRemote: false,
    saving: false,
    saveTimer: null,
    pollTimer: null,
    lastRemoteUpdatedAt: null,
    clientId: uid("client")
  };

  function setStatus(text, mode = "") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `sync-status ${mode}`.trim();
  }

  async function request(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Supabase HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function normalize(candidate) {
    return normalizeState(candidate);
  }

  async function loadRemote() {
    const rows = await request(`${TABLE}?id=eq.${encodeURIComponent(STATE_ID)}&select=state,updated_at`);
    return rows?.[0] || null;
  }

  function scheduleSave() {
    if (!sync.ready || sync.applyingRemote) return;
    clearTimeout(sync.saveTimer);
    sync.saveTimer = setTimeout(saveRemote, 650);
  }

  async function saveRemote() {
    if (!sync.ready || sync.applyingRemote || sync.saving) return;

    sync.saving = true;
    setStatus("Speichert in Supabase...", "online");

    const updatedAt = new Date().toISOString();
    const payload = {
      id: STATE_ID,
      state,
      updated_at: updatedAt,
      updated_by: sync.clientId
    };

    try {
      const rows = await request(TABLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify(payload)
      });

      sync.lastRemoteUpdatedAt = rows?.[0]?.updated_at || updatedAt;
      setStatus("Online gespeichert", "online");
    } catch (error) {
      setStatus("Offline: nur lokal gespeichert", "offline");
      console.error("Supabase save failed", error);
    } finally {
      sync.saving = false;
    }
  }

  async function refreshFromRemote() {
    if (!sync.ready || sync.saving) return;

    try {
      const row = await loadRemote();
      if (!row || row.updated_at === sync.lastRemoteUpdatedAt) return;

      sync.lastRemoteUpdatedAt = row.updated_at;
      sync.applyingRemote = true;
      state = normalize(row.state);
      originalSaveState();
      render();
      setStatus("Online synchronisiert", "online");
    } catch (error) {
      setStatus("Offline: Verbindung pruefen", "offline");
      console.error("Supabase refresh failed", error);
    } finally {
      sync.applyingRemote = false;
    }
  }

  saveState = () => {
    originalSaveState();
    scheduleSave();
  };

  async function init() {
    setStatus("Datenbank wird verbunden...");

    try {
      const row = await loadRemote();
      sync.ready = true;

      if (row) {
        sync.lastRemoteUpdatedAt = row.updated_at;
        sync.applyingRemote = true;
        state = normalize(row.state);
        originalSaveState();
        render();
        sync.applyingRemote = false;
        setStatus("Online synchronisiert", "online");
      } else {
        await saveRemote();
      }

      clearInterval(sync.pollTimer);
      sync.pollTimer = setInterval(refreshFromRemote, 5000);
    } catch (error) {
      setStatus("Supabase-Tabelle fehlt oder ist gesperrt", "offline");
      console.error("Supabase init failed", error);
    }
  }

  init();
})();
