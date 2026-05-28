export const DEMO_EMAIL = "demo@jointhebooth.com";

export function isDemoUser(user) {
  return user?.email?.toLowerCase() === DEMO_EMAIL;
}

export function showDemoBlocked(message) {
  alert(
    message ||
      "This action is disabled in the demo account so the preview stays safe for everyone."
  );
}