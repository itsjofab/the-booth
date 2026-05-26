import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";

export const useAppStore = create((set, get) => ({
  user: undefined,
  profile: undefined,
  appReady: false,
  unreadNotifications: 0,
  joinedCommunityIds: [],

  setUser: (user) => set({ user }),

loadSession: async () => {

const { data } = await supabase.auth.getUser();

const currentUser = data?.user ?? null;

  if (!currentUser) {
    set({
      user: null,
      profile: null,
      appReady: true,
      unreadNotifications: 0,
      joinedCommunityIds: [],
    });

    return null;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, profile_completed")
    .eq("id", currentUser.id)
    .maybeSingle();

  set({
    user: currentUser,
    profile: profileData ?? null,
    appReady: true,
  });

  return currentUser;
},

  loadProfile: async () => {
    const user = get().user;

    if (!user) {
      set({ profile: null });
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, profile_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("LOAD PROFILE STORE ERROR:", error);
      set({ profile: null });
      return null;
    }

    set({ profile: data ?? null });
    return data ?? null;
  },

  loadUnreadNotifications: async () => {
    const user = get().user;

    if (!user) {
      set({ unreadNotifications: 0 });
      return 0;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (!error) {
      set({ unreadNotifications: count || 0 });
    }

    return count || 0;
  },

  loadJoinedCommunityIds: async () => {
    const user = get().user;

    if (!user) {
      set({ joinedCommunityIds: [] });
      return [];
    }

    const { data, error } = await supabase
      .from("memberships")
      .select("community_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("JOINED COMMUNITIES STORE ERROR:", error);
      set({ joinedCommunityIds: [] });
      return [];
    }

    const ids = (data || []).map((row) => row.community_id);

    set({ joinedCommunityIds: ids });
    return ids;
  },

  resetAppStore: () =>
    set({
      user: null,
      profile: null,
      appReady: true,
      unreadNotifications: 0,
      joinedCommunityIds: [],
    }),
}));