export function getAvatarUrl(profile) {
  return (
    profile?.avatar_url ||
    "/default-avatar.png"
  );
}

export function getCommunityBanner(community) {
  return (
    community?.banner_url ||
    "linear-gradient(135deg, #e5e5e5, #f3f3f3)"
  );
}

export function getProfileBanner(profile) {
  return (
    profile?.banner_url ||
    "linear-gradient(135deg, #dfe9f3, #ffffff)"
  );
}