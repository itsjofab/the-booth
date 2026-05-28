export const DEMO_EMAIL = "demo@jointhebooth.com";

export function isDemoUser(user) {
  return user?.email?.toLowerCase() === DEMO_EMAIL;
}

export const demoJoinRequests = [
  {
    id: "demo-request-1",
    user_id: "demo-fake-user-1",
    answer_text: "I want to join because I like testing new communities.",
    selected_answer: null,
    profile: {
      username: "preview_member",
      avatar_url: "/default-avatar.png",
    },
  },
  {
    id: "demo-request-2",
    user_id: "demo-fake-user-2",
    answer_text: "I am interested in the community topic.",
    selected_answer: null,
    profile: {
      username: "sample_user",
      avatar_url: "/default-avatar.png",
    },
  },
];

export const demoMembers = [
  {
    id: "demo-member-1",
    user_id: "demo-fake-user-1",
    role: "member",
    created_at: new Date().toISOString(),
    profile: {
      username: "preview_member",
      avatar_url: "/default-avatar.png",
    },
  },
  {
    id: "demo-member-2",
    user_id: "demo-fake-user-2",
    role: "member",
    created_at: new Date().toISOString(),
    profile: {
      username: "sample_user",
      avatar_url: "/default-avatar.png",
    },
  },
  {
    id: "demo-mod-1",
    user_id: "demo-fake-mod-1",
    role: "mod",
    created_at: new Date().toISOString(),
    profile: {
      username: "demo_mod",
      avatar_url: "/default-avatar.png",
    },
  },
];

export const demoReportedPosts = [
  {
    id: "demo-report-1",
    content: "This is a fake reported post so demo users can preview moderation.",
    image_url: null,
    media_url: null,
    media_type: null,
    gif_url: null,
    created_at: new Date().toISOString(),
    user_id: "demo-fake-user-1",
    profile: {
      username: "preview_member",
      avatar_url: "/default-avatar.png",
    },
  },
];

export const demoNotifications = [
  {
    id: "demo-notification-1",
    type: "join_request",
    title: "New join request",
    message: "preview_member requested to join Demo.",
    community_id: "8f356faa-2eda-47f9-b021-196f77ecb9d1",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-notification-2",
    type: "join_request",
    title: "New join request",
    message: "sample_user requested to join Demo.",
    community_id: "8f356faa-2eda-47f9-b021-196f77ecb9d1",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-notification-3",
    type: "report",
    title: "Post reported",
    message: "A post was reported in Demo.",
    community_id: "8f356faa-2eda-47f9-b021-196f77ecb9d1",
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

export const demoReportedFeedPost = {
  id: "demo-reported-feed-post",
  content:
    "This is a fake reported post. Demo admins can preview hiding or clearing this report safely.",
  image_url: null,
  media_url: null,
  media_type: null,
  gif_url: null,
  created_at: new Date().toISOString(),
  user_id: "demo-fake-user-1",

  // REPLACE THIS WITH YOUR REAL DEMO COMMUNITY ID
  community_id: "8f356faa-2eda-47f9-b021-196f77ecb9d1",

  is_reported: true,
  is_hidden: false,

  profile: {
    username: "preview_member",
    avatar_url: "/default-avatar.png",
  },

  community: {
    name: "Demo",
  },
};