"use server";

import { createClient } from "@/lib/supabase/server";

const issueTypes = new Set(["incorrect_price", "incorrect_item", "menu_out_of_date", "file_problem", "other"]);
export type MenuReportState = { error?: string; success?: string };

function value(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }

export async function submitMenuReport(_state: MenuReportState, formData: FormData): Promise<MenuReportState> {
  const restaurantId = value(formData, "restaurantId");
  const versionId = value(formData, "versionId");
  const issueType = value(formData, "issueType");
  const message = value(formData, "message");
  const contact = value(formData, "contact");
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId) || !/^[0-9a-f-]{36}$/i.test(versionId)) return { error: "This menu could not be identified. Refresh the page and try again." };
  if (!issueTypes.has(issueType) || message.length < 20 || message.length > 1000) return { error: "Choose the issue type and describe the problem in at least 20 characters." };
  if (contact && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || contact.length > 254)) return { error: "Enter a valid email address or leave the contact field blank." };

  try {
    const supabase = await createClient();
    const { data: currentMenu } = await supabase.from("menu_versions").select("id").eq("id", versionId).eq("restaurant_id", restaurantId).eq("status", "published").maybeSingle();
    if (!currentMenu) return { error: "This menu is no longer available to report." };
    const { error } = await supabase.from("menu_reports").insert({
      restaurant_id: restaurantId,
      menu_version_id: versionId,
      issue_type: issueType,
      message,
      reporter_contact: contact || null,
    });
    if (error) return { error: "Your report could not be sent right now. Please try again." };
    return { success: "Thank you. Your report has been sent to the Yene Menu team." };
  } catch {
    return { error: "Reports are not connected yet. Please try again later." };
  }
}
