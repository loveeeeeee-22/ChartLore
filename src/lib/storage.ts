export const STORAGE_KEYS = {
  user: "chartlore-user",
  trades: "chartlore-trades",
  profile: "chartlore-profile",
  tags: "chartlore-tags",
  accounts: "chartlore-accounts",
} as const;

export const STORAGE_EVENT = "chartlore-storage";

export function notifyStorageChange(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}
