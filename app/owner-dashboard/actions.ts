"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const categories = new Set(["Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy", "Other"]);
const neighborhoods = new Set(["Bole", "Kazanchis", "Piazza", "Sarbet", "Old Airport", "Mexico", "Kirkos", "Other"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

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
  const coverImage = formData.get("coverImage");
  const imageFile = coverImage instanceof File && coverImage.size > 0 ? coverImage : null;

  if (name.length < 2 || name.length > 100 || !categories.has(category) || !neighborhoods.has(neighborhood) || !address || address.length > 240 || description.length > 600 || phone.length > 40 || website.length > 300) {
    redirect("/owner-dashboard/restaurants/new?error=invalid");
  }
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (!(parsedWebsite.protocol === "https:" || parsedWebsite.protocol === "http:")) throw new Error("Invalid URL protocol");
    } catch { redirect("/owner-dashboard/restaurants/new?error=invalid"); }
  }
  if (imageFile && (!imageTypes.has(imageFile.type) || imageFile.size > maxImageBytes)) redirect("/owner-dashboard/restaurants/new?error=image");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: verifiedOwner, error: roleError } = await supabase.rpc("is_verified_owner");
  if (roleError || verifiedOwner !== true) redirect("/owner-dashboard/restaurants/new?error=not-owner");

  const restaurantId = randomUUID();
  const slug = `${slugify(name)}-${restaurantId.slice(0, 8)}`;
  const { error } = await supabase.from("restaurants").insert({
    id: restaurantId,
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

  let imageError: "upload" | "save" | null = null;
  if (imageFile) {
    const extension = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type === "image/png" ? "png" : "webp";
    const path = `${restaurantId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("restaurant-images").upload(path, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadError) {
      console.error("Restaurant cover photo upload failed:", uploadError.message);
      imageError = "upload";
    }
    else {
      const { error: imageSaveError } = await supabase.from("restaurants").update({ cover_image_path: path }).eq("id", restaurantId).eq("owner_id", user.id);
      if (imageSaveError) {
        console.error("Restaurant cover photo path could not be saved:", imageSaveError.message);
        imageError = "save";
        await supabase.storage.from("restaurant-images").remove([path]);
      }
    }
  }

  revalidatePath("/owner-dashboard");
  revalidatePath("/admin");
  redirect(`/owner-dashboard?added=1${imageError ? `&imageError=${imageError}` : ""}`);
}

export async function updateRestaurantAndRequestReview(formData: FormData) {
  const restaurantId = value(formData, "restaurantId");
  const name = value(formData, "restaurantName");
  const category = value(formData, "category");
  const neighborhood = value(formData, "neighborhood");
  const address = value(formData, "address");
  const description = value(formData, "description");
  const phone = value(formData, "phone");
  const website = value(formData, "website");
  const coverImage = formData.get("coverImage");
  const imageFile = coverImage instanceof File && coverImage.size > 0 ? coverImage : null;
  const back = `/owner-dashboard/restaurants/edit?restaurantId=${encodeURIComponent(restaurantId)}`;

  if (!/^[0-9a-f-]{36}$/i.test(restaurantId) || name.length < 2 || name.length > 100 || !categories.has(category) || !neighborhoods.has(neighborhood) || !address || address.length > 240 || description.length > 600 || phone.length > 40 || website.length > 300) redirect(`${back}&error=invalid`);
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (!(parsedWebsite.protocol === "https:" || parsedWebsite.protocol === "http:")) throw new Error("Invalid URL protocol");
    } catch { redirect(`${back}&error=invalid`); }
  }
  if (imageFile && (!imageTypes.has(imageFile.type) || imageFile.size > maxImageBytes)) redirect(`${back}&error=image`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: verifiedOwner } = await supabase.rpc("is_verified_owner");
  if (verifiedOwner !== true) redirect(`${back}&error=not-owner`);
  let imagePath: string | undefined;
  if (imageFile) {
    const extension = imageFile.type === "image/jpeg" ? "jpg" : imageFile.type === "image/png" ? "png" : "webp";
    imagePath = `${restaurantId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("restaurant-images").upload(imagePath, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadError) {
      console.error("Restaurant cover photo upload failed:", uploadError.message, uploadError.name);
      redirect(`${back}&error=upload`);
    }
  }
  const { data: updated, error } = await supabase.from("restaurants").update({
    name, category, neighborhood, street_address: address, description,
    public_phone: phone || null, website_url: website || null, status: "pending_review",
    ...(imagePath ? { cover_image_path: imagePath } : {}),
  }).eq("id", restaurantId).eq("owner_id", user.id).in("status", ["approved", "rejected", "pending_review"]).select("id, slug, cover_image_path").maybeSingle();
  if ((error || !updated) && imagePath) await supabase.storage.from("restaurant-images").remove([imagePath]);
  if (error || !updated) redirect(`${back}&error=save`);
  if (imagePath && updated.cover_image_path !== imagePath) await supabase.storage.from("restaurant-images").remove([imagePath]);
  revalidatePath("/owner-dashboard");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/restaurants/${updated.slug}`);
  redirect("/owner-dashboard?resubmitted=1");
}

export async function deleteRejectedRestaurant(formData: FormData) {
  const restaurantId = value(formData, "restaurantId");
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId) || formData.get("confirmDelete") !== "on") redirect("/owner-dashboard?deleteError=confirm");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: restaurant } = await supabase.from("restaurants").select("cover_image_path").eq("id", restaurantId).eq("owner_id", user.id).eq("status", "rejected").maybeSingle();
  if (!restaurant) redirect("/owner-dashboard?deleteError=failed");
  const { data: versions } = await supabase.from("menu_versions").select("id").eq("restaurant_id", restaurantId);
  const versionIds = (versions ?? []).map((version) => version.id);
  if (versionIds.length) {
    const { data: assets, error: assetReadError } = await supabase.from("menu_assets").select("storage_path").in("version_id", versionIds);
    if (assetReadError) redirect("/owner-dashboard?deleteError=failed");
    const paths = (assets ?? []).map((asset) => asset.storage_path);
    if (paths.length) {
      const { error: menuFilesDeleteError } = await supabase.storage.from("menu-files").remove(paths);
      if (menuFilesDeleteError) redirect("/owner-dashboard?deleteError=failed");
    }
  }
  if (restaurant.cover_image_path) {
    const { error: imageDeleteError } = await supabase.storage.from("restaurant-images").remove([restaurant.cover_image_path]);
    if (imageDeleteError) redirect("/owner-dashboard?deleteError=failed");
  }
  const { data: deleted, error } = await supabase.from("restaurants").delete().eq("id", restaurantId).eq("owner_id", user.id).eq("status", "rejected").select("id").maybeSingle();
  if (error || !deleted) redirect("/owner-dashboard?deleteError=failed");
  revalidatePath("/owner-dashboard");
  redirect("/owner-dashboard?deleted=1");
}
