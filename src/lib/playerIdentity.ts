function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getOrCreatePlayerId() {
  const key = "a3_player_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = randomId();
  localStorage.setItem(key, id);
  return id;
}

export function getOrCreateDisplayName() {
  const key = "a3_display_name";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const name = `玩家${suffix}`;
  localStorage.setItem(key, name);
  return name;
}

