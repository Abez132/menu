"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const categories = new Set(["Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy", "Other"]);
const neighborhoods = new Set(["Bole", "Kazanchis", "Piazza", "Sarbet", "Old Airport", "Mexico", "Kirkos", "Other"]);

function value(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "restaurant";
}

export async function signOutOwner() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function addAnotherRestaurant(formData: FormData) {
  const name = value(formData, "restaurantName");
  const category = value(formData, "category");
  const neighborhood = value(formData, "neighborhood");
  const address = value(formData, "address");
  const description = value(formData, "description");
  const phone = value(formData, "phone");
  const website = value(formData, "website");

  if (name.length < 2 || name.length > 100 || !categories.has(category) || !neighborhoods.has(neighborhood) || !address || address.length > 240 || description.length > 600 || phone.length > 40 || website.length > 300) {
    redirect("/owner-dashboard/restaurants/new?error=invalid");
  }
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (!(parsedWebsite.protocol === "https:" || parsedWebsite.protocol === "http:")) throw new Error("Invalid URL protocol");
    } catch { redirect("/owner-dashboard/restaurants/new?error=invalid"); }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: verifiedOwner, error: roleError } = await supabase.rpc("is_verified_owner");
  if (roleError || verifiedOwner !== true) redirect("/owner-dashboard/restaurants/new?error=not-owner");

  const slug = `${slugify(name)}-${randomUUID().slice(0, 8)}`;
  const { error } = await supabase.from("restaurants").insert({
    owner_id: user.id,
    name,
    slug,
    category,
    neighborhood,
    street_address: address,
    description,
    public_phone: phone || null,
    website_url: website || null,
    status: "pending_review",
  });
  if (error) redirect("/owner-dashboard/restaurants/new?error=save");

  revalidatePath("/owner-dashboard");
  revalidatePath("/admin");
  redirect("/owner-dashboard?added=1");
}
