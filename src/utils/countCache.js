export function getCachedCount(key, fallback = 0) {
  const value = sessionStorage.getItem(key);
  return value === null ? fallback : Number(value);
}

export function setCachedCount(key, value) {
  sessionStorage.setItem(key, String(value || 0));
}