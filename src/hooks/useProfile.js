import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useProfile(user) {
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      // not logged in
      if (!user) {
        if (active) {
          setProfile(null);
        }
        return;
      }

      // loading state
      setProfile(undefined);

      const { data, error } = await supabase
        .from("profiles")
        .select(`
  id,
  username,
  full_name,
  bio,
  avatar_url,
  banner_url,
  created_at,
  email
`)
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setProfile(null);
        return;
      }

      // profile exists OR null
      setProfile(data ?? null);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  return profile;
}