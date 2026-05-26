import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed",
        },
        405
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error: "Missing server environment variables.",
        },
        500
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          error: "Missing auth header.",
        },
        401
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    const { count: ownedCommunityCount, error: ownedCommunityError } =
      await admin
        .from("communities")
        .select("*", { count: "exact", head: true })
        .eq("created_by", userId);

    if (ownedCommunityError) throw ownedCommunityError;

    if ((ownedCommunityCount || 0) > 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "You must transfer ownership of your communities before deleting your account.",
        },
        400
      );
    }

    const { data: adminCommunities, error: adminCheckError } = await admin
      .from("memberships")
      .select("community_id")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (adminCheckError) throw adminCheckError;

    for (const adminMembership of adminCommunities || []) {
      const { count, error: countError } = await admin
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("community_id", adminMembership.community_id)
        .eq("role", "admin");

      if (countError) throw countError;

      if ((count || 0) <= 1) {
        return jsonResponse(
          {
            success: false,
            error:
              "You cannot delete your account yet because you are the only admin of one or more communities. Please make another member an admin first, then try again.",
          },
          400
        );
      }
    }

    await admin.from("bookmarks").delete().eq("user_id", userId);
    await admin.from("likes").delete().eq("user_id", userId);
    await admin.from("memberships").delete().eq("user_id", userId);

    await admin
      .from("community_join_requests")
      .delete()
      .eq("user_id", userId);

    await admin
      .from("community_archives")
      .delete()
      .eq("user_id", userId);

    await admin.from("comments").delete().eq("user_id", userId);
    await admin.from("posts").delete().eq("user_id", userId);

    await admin
    .from("notifications")
    .delete()
    .eq("recipient_id", userId);

    await admin.from("profiles").delete().eq("id", userId);

    const { error: deleteUserError } =
      await admin.auth.admin.deleteUser(userId, false);

    if (deleteUserError) throw deleteUserError;

    return jsonResponse({ success: true }, 200);
  } catch (err: unknown) {
    console.error("DELETE ACCOUNT ERROR:", err);

    return jsonResponse(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not delete account.",
      },
      500
    );
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}