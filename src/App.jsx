import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabaseClient";
import { ensureProfile } from "./utils/ensureProfile";

import AppLayout from "./layouts/AppLayout";

import HomeFeed from "./pages/HomeFeed";
import CommunityPage from "./pages/CommunityPage";
import Login from "./pages/Login";
import PostPage from "./pages/PostPage";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import Communities from "./pages/Communities";
import CreateCommunity from "./pages/CreateCommunity";
import Discover from "./pages/Discover";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProfileSetup from "./pages/ProfileSetup";
import CommunityModerators from "./pages/CommunityModerators";
import CommunityMembers from "./pages/CommunityMembers";
import CommunityAdmin from "./pages/CommunityAdmin";
import CommunityAdminMembers from "./pages/CommunityAdminMembers";
import CommunityAdminReports from "./pages/CommunityAdminReports";
import CommunityAdminModerators from "./pages/CommunityAdminModerators";
import CommunityAdminJoinRequests from "./pages/CommunityAdminJoinRequests";
import ProfileSettings from "./pages/ProfileSettings";
import CommunityAdminTransfer from "./pages/CommunityAdminTransfer";
import CommentPage from "./pages/CommentPage";
import Notifications from "./pages/Notifications";
import LandingPage from "./pages/LandingPage";

function ProtectedRoute({ user, children }) {
  if (user === undefined) {
    return <div style={{ padding: "20px" }}>Loading session...</div>;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppGate({ user, children }) {
  const location = useLocation();
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      await Promise.resolve();

      if (!active) return;

      if (user === undefined) {
        return;
      }

      if (user === null) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("PROFILE GATE ERROR:", error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  if (user === undefined) {
    return <div style={{ padding: "20px" }}>Loading profile...</div>;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (profile === undefined) {
    return <div style={{ padding: "20px" }}>Loading profile...</div>;
  }

  const profileComplete = profile?.profile_completed && profile?.username;
  const isSetupPage = location.pathname === "/profile-setup";

  if (!profileComplete && !isSetupPage) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

function RootGate({ user }) {
  const location = useLocation();

  if (user === undefined) {
    return <div style={{ padding: "20px" }}>Loading session...</div>;
  }

  if (user === null && location.pathname === "/") {
    return <LandingPage />;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppGate user={user}>
      <AppLayout />
    </AppGate>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("SESSION ERROR:", error);
        }

        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          ensureProfile(currentUser);
        }
      } catch (err) {
        console.error("AUTH INIT ERROR:", err);

        if (mounted) {
          setUser(null);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        ensureProfile(currentUser);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute user={user}>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RootGate user={user} />}>
          <Route index element={<HomeFeed />} />
          <Route path="discover" element={<Discover />} />
          <Route path="communities" element={<Communities />} />
          <Route path="communities/new" element={<CreateCommunity />} />
          <Route path="c/:id" element={<CommunityPage />} />
          <Route path="post/:id" element={<PostPage />} />
          <Route path="comment/:id" element={<CommentPage />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile/:id" element={<Profile />} />
          <Route path="c/:id/moderators" element={<CommunityModerators />} />
          <Route path="c/:id/members" element={<CommunityMembers />} />
          <Route path="c/:id/admin" element={<CommunityAdmin />} />
          <Route path="c/:id/admin/members" element={<CommunityAdminMembers />} />
          <Route path="c/:id/admin/reports" element={<CommunityAdminReports />} />
          <Route
            path="c/:id/admin/moderators"
            element={<CommunityAdminModerators />}
          />
          <Route
            path="c/:id/admin/requests"
            element={<CommunityAdminJoinRequests />}
          />
          <Route path="profile/settings" element={<ProfileSettings />} />
          <Route
            path="c/:id/admin/transfer"
            element={<CommunityAdminTransfer />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}