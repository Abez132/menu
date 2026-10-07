"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const reportStatuses = new Set(["open", "investigating", "resolved", "dismissed"]);

function value(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: allowed, error } = await supabase.rpc("is_admin");
  if (error || allowed !== true) redirect("/owner-dashboard");
  return { supabase, user };
}

export async function moderateRestaurant(formData: FormData) {
  const id = value(formData, "restaurantId");
  const intent = value(formData, "intent");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin?error=invalid");
  const transitions: Record<string, { from: string[]; to: string }> = {
    approve: { from: ["pending_review", "rejected"], to: "approved" },
    reject: { from: ["pending_review"], to: "rejected" },
    suspend: { from: ["approved"], to: "suspended" },
    restore: { from: ["suspended"], to: "approved" },
  };
  const transition = transitions[intent];
  if (!transition) redirect("/admin?error=invalid");
  const { supabase } = await adminClient();
  const { data: restaurant } = await supabase.from("restaurants").select("slug, status").eq("id", id).maybeSingle();
  if (!restaurant || !transition.from.includes(restaurant.status)) redirect("/admin?error=changed");
  const { data: updated, error } = await supabase.from("restaurants").update({ status: transition.to }).eq("id", id).eq("status", restaurant.status).select("slug").maybeSingle();
  if (error || !updated) redirect("/admin?error=save");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/restaurants/${updated.slug}`);
  redirect(`/admin?status=${transition.to}&saved=1`);
}


export async function moderateMenuReport(formData: FormData) {
  const id = value(formData, "reportId");
  const status = value(formData, "status");
  const note = value(formData, "adminNote");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !reportStatuses.has(status) || note.length > 1000) redirect("/admin?status=reports&error=invalid");
  const { supabase, user } = await adminClient();
  const { error } = await supabase.from("menu_reports").update({
    status,
    admin_note: note || null,
    reviewed_by: status === "open" ? null : user.id,
    reviewed_at: status === "open" ? null : new Date().toISOString(),
  }).eq("id", id);
  if (error) redirect("/admin?status=reports&error=save");
  revalidatePath("/admin");
  redirect(`/admin?status=reports&reportStatus=${status}&saved=1`);
}

export async function moderateReportedMenu(formData: FormData) {
  const id = value(formData, "versionId");
  const visible = value(formData, "visible");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["true", "false"].includes(visible)) redirect("/admin?status=reports&error=invalid");
  const { supabase } = await adminClient();
  const { error } = await supabase.rpc("set_menu_visibility", { p_version_id: id, p_visible: visible === "true" });
  if (error) redirect("/admin?status=reports&error=save");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin?status=reports&saved=1");
}
