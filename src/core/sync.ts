import { createBackup, restoreBackup } from "./backup";

const SYNC_ENDPOINT = "/life-compass/api/data/";
const PUSH_INTERVAL_MS = 20000;

function isAuthenticated(): boolean {
  return document.body.dataset.authenticated === "true";
}

function csrfToken(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
  return meta?.content ?? "";
}

// Guards against a narrow but real race: if the page starts unloading before
// the initial pull has resolved, `beforeunload` must not push local state —
// it may still be the pre-sync/default state, and pushing it would overwrite
// real saved data on the server with it. Nothing pushes until pull settles.
let hasPulledOnce = false;

/** Pulls the signed-in user's saved data and seeds localStorage with it,
 * before the page's own controller reads localStorage. No-op for anonymous
 * visitors (the public demo) and on any network/parse failure — in both
 * cases the app just falls back to whatever is already in localStorage.
 */
export async function pullRemoteData(): Promise<void> {
  if (!isAuthenticated()) {
    hasPulledOnce = true;
    return;
  }

  try {
    const response = await fetch(SYNC_ENDPOINT, { credentials: "same-origin" });
    if (!response.ok) return;

    const payload = (await response.json()) as { data?: Record<string, unknown> };
    if (payload.data && Object.keys(payload.data).length > 0) {
      restoreBackup(payload);
    }
  } catch {
    // Offline or the endpoint failed — keep whatever is already local.
  } finally {
    hasPulledOnce = true;
  }
}

function pushRemoteData(): void {
  if (!isAuthenticated() || !hasPulledOnce) return;

  const body = JSON.stringify(createBackup());
  fetch(SYNC_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
    keepalive: true,
    body
  }).catch(() => {
    // Best-effort — the next interval or page load will retry.
  });
}

/** Call once per page after the initial pull. Pushes changes back on an
 * interval and whenever the tab is hidden/closed, so nothing is lost even
 * without an explicit save action.
 */
export function startSyncLoop(): void {
  if (!isAuthenticated()) return;

  window.addEventListener("beforeunload", pushRemoteData);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pushRemoteData();
  });
  window.setInterval(pushRemoteData, PUSH_INTERVAL_MS);
}
