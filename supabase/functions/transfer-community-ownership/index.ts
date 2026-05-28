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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing server environment variables." },
        500
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing auth header." }, 401);
    }

    const body = await req.json();
    const communityId = body.communityId;
    const newOwnerId = body.newOwnerId;

    if (!communityId || !newOwnerId) {
      return jsonResponse(
        { error: "Missing communityId or newOwnerId." },
        400
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
  return jsonResponse({ error: "Unauthorized." }, 401);
}


if (user.email?.toLowerCase() === "demo@jointhebooth.com") {
  return jsonResponse(
    {
      error: "This action is disabled for the demo account.",
    },
    403
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey);
const oldOwnerId = user.id;

    const { data: community, error: communityError } = await admin
      .from("communities")
      .select("id, created_by")
      .eq("id", communityId)
      .maybeSingle();

    if (communityError) throw communityError;

    if (!community) {
      return jsonResponse({ error: "Community not found." }, 404);
    }

    if (community.created_by !== oldOwnerId) {
      return jsonResponse(
        { error: "Only the current owner can transfer ownership." },
        403
      );
    }

    const { data: newOwnerMembership, error: newOwnerMembershipError } =
      await admin
        .from("memberships")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", newOwnerId)
        .maybeSingle();

    if (newOwnerMembershipError) throw newOwnerMembershipError;

    if (!newOwnerMembership) {
      return jsonResponse(
        { error: "New owner must already be a community member." },
        400
      );
    }

    const { error: promoteError } = await admin
      .from("memberships")
      .update({ role: "admin" })
      .eq("community_id", communityId)
      .eq("user_id", newOwnerId);

    if (promoteError) throw promoteError;

    const { error: demoteError } = await admin
      .from("memberships")
      .update({ role: "member" })
      .eq("community_id", communityId)
      .eq("user_id", oldOwnerId);

    if (demoteError) throw demoteError;

    const { error: ownerError } = await admin
      .from("communities")
      .update({ created_by: newOwnerId })
      .eq("id", communityId);

    if (ownerError) throw ownerError;

    return jsonResponse({ success: true }, 200);
  } catch (err: unknown) {
    console.error("TRANSFER OWNERSHIP ERROR:", err);

    return jsonResponse(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not transfer ownership.",
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