"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MenuAsset, MenuContent } from "@/lib/menu-types";
import { createClient } from "@/lib/supabase/server";

const bucket = "menu-files";
const maxFileSize = 5 * 1024 * 1024;
const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export type MenuActionState = { error?: string; success?: string };

export async function createMenuDraft(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId)) redirect("/owner-dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");

  const { data: restaurant } = await supabase.from("restaurants").select("id, status").eq("id", restaurantId).eq("owner_id", user.id).maybeSingle();
  if (!restaurant || restaurant.status === "suspended") redirect("/owner-dashboard");

  const { data: existing } = await supabase.from("menu_versions").select("id").eq("restaurant_id", restaurant.id).eq("status", "draft").maybeSingle();
  if (existing) redirect(`/owner-dashboard/menu?restaurantId=${restaurant.id}`);

  const { data: published } = await supabase.from("menu_versions").select("id, content").eq("restaurant_id", restaurant.id).in("status", ["published", "hidden"]).maybeSingle();
  const { data: draft, error } = await supabase.from("menu_versions").insert({
    restaurant_id: restaurant.id,
    status: "draft",
    content: published?.content ?? { sections: [] },
  }).select("id").single();
  if (error || !draft) redirect("/owner-dashboard?menuError=create");

  if (published) {
    const { data: oldAssets } = await supabase.from("menu_assets").select("storage_path, original_name, content_type, size_bytes").eq("version_id", published.id);
    if (oldAssets?.length) {
      await supabase.from("menu_assets").insert(oldAssets.map((asset) => ({ ...asset, version_id: draft.id })));
    }
  }
  redirect(`/owner-dashboard/menu?restaurantId=${restaurant.id}`);
}

function parseContent(value: FormDataEntryValue | null): MenuContent | null {
  try {
    const parsed = JSON.parse(String(value ?? "")) as MenuContent;
    if (!parsed || !Array.isArray(parsed.sections) || parsed.sections.length > 20) return null;
    let itemCount = 0;
    for (const section of parsed.sections) {
      if (typeof section.name !== "string" || !section.name.trim() || section.name.length > 80 || !Array.isArray(section.items)) return null;
      itemCount += section.items.length;
      for (const item of section.items) {
        if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 100) return null;
        if (typeof item.description !== "string" || item.description.length > 300) return null;
        if (!Number.isInteger(item.price) || item.price < 0 || item.price > 10_000_000) return null;
        if (!Array.isArray(item.tags) || item.tags.length > 8 || item.tags.some((tag) => typeof tag !== "string" || tag.length > 30)) return null;
      }
    }
    if (itemCount > 200) return null;
    return { sections: parsed.sections.map((section) => ({
      name: section.name.trim(),
      items: section.items.map((item) => ({ name: item.name.trim(), description: item.description.trim(), price: item.price, tags: item.tags.map((tag) => tag.trim()).filter(Boolean) })),
    })) };
  } catch {
    return null;
  }
}

function parseAssets(value: FormDataEntryValue | null): MenuAsset[] | null {
  try {
    const assets = JSON.parse(String(value ?? "[]")) as MenuAsset[];
    if (!Array.isArray(assets) || assets.length > 10) return null;
    for (const asset of assets) {
      if (!asset || typeof asset.path !== "string" || asset.path.length > 500 || typeof asset.name !== "string" || asset.name.length > 180) return null;
      if (typeof asset.type !== "string" || !acceptedTypes.has(asset.type) || !Number.isInteger(asset.size) || asset.size < 1 || asset.size > maxFileSize) return null;
    }
    return assets;
  } catch {
    return null;
  }
}

export async function saveMenuDraft(_state: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const content = parseContent(formData.get("content"));
  const assets = parseAssets(formData.get("assets"));
  const versionId = String(formData.get("versionId") ?? "");
  if (!content || !assets || !/^[0-9a-f-]{36}$/i.test(versionId)) return { error: "Some menu details are invalid. Review them and try again." };
  if (new Set(assets.map((asset) => asset.path)).size !== assets.length) return { error: "A menu file appears more than once." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: version } = await supabase.from("menu_versions").select("id, restaurant_id, status, restaurants!inner(owner_id, slug, status)").eq("id", versionId).maybeSingle();
  if (!version || version.status !== "draft") return { error: "This draft is no longer available. Refresh the page and try again." };
  const restaurant = version.restaurants as unknown as { owner_id: string; slug: string; status: string };
  if (restaurant.owner_id !== user.id || restaurant.status === "suspended") return { error: "This restaurant can’t prepare a menu right now." };

  const prefix = `${version.restaurant_id}/`;
  if (assets.some((asset) => !asset.path.startsWith(prefix) || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i.test(asset.path))) {
    return { error: "One of the uploaded files does not belong to this restaurant." };
  }

  const { error: contentError } = await supabase.from("menu_versions").update({ content, updated_at: new Date().toISOString() }).eq("id", version.id).eq("status", "draft");
  if (contentError) return { error: "We couldn’t save the menu. Check your connection and try again." };

  const { data: currentAssets } = await supabase.from("menu_assets").select("id, storage_path").eq("version_id", version.id);
  const keepPaths = new Set(assets.map((asset) => asset.path));
  const removed = (currentAssets ?? []).filter((asset) => !keepPaths.has(asset.storage_path));
  if (removed.length) {
    const { error } = await supabase.from("menu_assets").delete().in("id", removed.map((asset) => asset.id));
    if (error) return { error: "The menu saved, but its file list could not be updated. Please try again." };
  }

  const { data: savedAssets, error: assetError } = await supabase.from("menu_assets").select("storage_path").eq("version_id", version.id);
  if (assetError) return { error: "The menu saved, but we couldn’t check its existing files. Please try again." };
  const knownPaths = new Set((savedAssets ?? []).map((asset) => asset.storage_path));
  const newAssets = assets.filter((asset) => !knownPaths.has(asset.path));
  if (newAssets.length) {
    const { error } = await supabase.from("menu_assets").insert(newAssets.map((asset) => ({
      version_id: version.id,
      storage_path: asset.path,
      original_name: asset.name,
      content_type: asset.type,
      size_bytes: asset.size,
    })));
    if (error) return { error: "The menu saved, but a file could not be attached. Please try again." };
  }

  for (const path of removed.map((asset) => asset.storage_path)) {
    const { count } = await supabase.from("menu_assets").select("id", { count: "exact", head: true }).eq("storage_path", path);
    if (count === 0) await supabase.storage.from(bucket).remove([path]);
  }

  revalidatePath("/owner-dashboard/menu");
  return { success: "Draft saved. Review it below before publishing." };
}

export async function confirmAndPublishMenu(_state: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const versionId = String(formData.get("versionId") ?? "");
  const confirmed = formData.get("confirmAccuracy") === "on";
  if (!confirmed) return { error: "Please confirm that this menu is accurate before publishing." };
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return { error: "This menu version is invalid. Refresh and try again." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");

  const { data: version } = await supabase.from("menu_versions").select("id, restaurant_id, status, content, restaurants!inner(owner_id, slug, status)").eq("id", versionId).maybeSingle();
  if (!version || version.status !== "draft") return { error: "Save your current menu draft before publishing it." };
  const restaurant = version.restaurants as unknown as { owner_id: string; slug: string; status: string };
  if (restaurant.owner_id !== user.id || restaurant.status !== "approved") return { error: "You can only publish a menu for your approved restaurant." };
  const sections = (version.content as MenuContent | null)?.sections ?? [];
  const hasStructuredItems = sections.some((section) => section.items.length > 0);
  const { count } = await supabase.from("menu_assets").select("id", { count: "exact", head: true }).eq("version_id", version.id);
  if (!hasStructuredItems && !count) return { error: "Add at least one menu item or upload a menu photo or PDF before publishing." };

  const { error } = await supabase.rpc("publish_menu_version", { p_version_id: version.id, p_owner_confirmed: true });
  if (error) return { error: "We couldn’t publish this menu. Save it and try again." };
  revalidatePath(`/restaurants/${restaurant.slug}`);
  revalidatePath("/owner-dashboard/menu");
  return { success: "Your confirmed menu is now live." };
}
