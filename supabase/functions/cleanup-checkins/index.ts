import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Get old checkins
  const { data: oldCheckins, error: fetchError } = await supabase
    .from("checkins")
    .select("id, image_url")
    .lt("created_at", oneMonthAgo.toISOString());

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!oldCheckins || oldCheckins.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete storage files
  const filePaths = oldCheckins
    .map((c) => {
      const url = c.image_url;
      const match = url.match(/\/checkins\/(.+)$/);
      return match ? match[1] : null;
    })
    .filter(Boolean) as string[];

  if (filePaths.length > 0) {
    await supabase.storage.from("checkins").remove(filePaths);
  }

  // Delete DB records
  const ids = oldCheckins.map((c) => c.id);
  await supabase.from("checkins").delete().in("id", ids);

  return new Response(JSON.stringify({ deleted: ids.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
