import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "restaurant";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: NextRequest) {
  const destination = new URL("/for-restaurants/verification-error", request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    destination.searchParams.set("error", "verification");
    return NextResponse.redirect(destination);
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;
    if (userError || !user || !user.email_confirmed_at) throw new Error("Email verification could not be confirmed.");

    const draft = user.user_metadata?.pending_restaurant;
    if (!isRecord(draft) || typeof draft.name !== "string" || typeof draft.category !== "string" || typeof draft.neighborhood !== "string" || typeof draft.street_address !== "string") {
      throw new Error("Restaurant details were not found for this account.");
    }

    const { data: existing } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!existing) {
      const { error: insertError } = await supabase.from("restaurants").insert({
        owner_id: user.id,
        name: draft.name.slice(0, 100),
        slug: `${slugify(draft.name)}-${user.id.slice(0, 6)}`,
        category: draft.category,
        neighborhood: draft.neighborhood,
        street_address: draft.street_address.slice(0, 240),
        description: typeof draft.description === "string" ? draft.description.slice(0, 600) : "",
        public_phone: typeof draft.public_phone === "string" ? draft.public_phone.slice(0, 40) : null,
        website_url: typeof draft.website_url === "string" ? draft.website_url.slice(0, 300) : null,
        status: "pending_review",
      });
      if (insertError) throw insertError;
    }

    return NextResponse.redirect(new URL("/for-restaurants/submitted", request.nextUrl.origin));
  } catch {
    destination.searchParams.set("error", "verification");
    return NextResponse.redirect(destination);
  }
}
