const KEY = "the_booth_demo_sandbox";

const defaultSandbox = {
  profile: {},
  posts: [],
  comments: {},
  likedPostIds: [],
  bookmarkedPostIds: [],
};

export function getDemoSandbox() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || defaultSandbox;
  } catch {
    return defaultSandbox;
  }
}

export function saveDemoSandbox(next) {
  sessionStorage.setItem(KEY, JSON.stringify(next));
}

export function resetDemoSandbox() {
  sessionStorage.removeItem(KEY);
}

export function updateDemoSandbox(updater) {
  const current = getDemoSandbox();
  const next = updater(current);
  saveDemoSandbox(next);
  return next;
}

export function isDemoPostId(postId) {
  return String(postId).startsWith("demo-");
}