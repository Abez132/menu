import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createMenuDraft } from "./actions";
import { MenuEditor } from "./editor";
import type { MenuAsset, MenuContent } from "@/lib/menu-types";

export default async function OwnerMenuPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const restaurantId = query.restaurantId ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId)) redirect("/owner-dashboard");
  const { data: restaurant } = await supabase.from("restaurants").select("id, name, slug, neighborhood, status").eq("owner_id", user.id).eq("id", restaurantId).maybeSingle();
  if (!restaurant) redirect("/owner-dashboard");

  const { data: draft } = restaurant.status !== "suspended"
    ? await supabase.from("menu_versions").select("id, content, updated_at").eq("restaurant_id", restaurant.id).eq("status", "draft").maybeSingle()
    : { data: null };
  const { data: published } = restaurant.status === "approved"
    ? await supabase.from("menu_versions").select("confirmed_at, status").eq("restaurant_id", restaurant.id).in("status", ["published", "hidden"]).maybeSingle()
    : { data: null };

  let assets: MenuAsset[] = [];
  if (draft) {
    const { data } = await supabase.from("menu_assets").select("storage_path, original_name, content_type, size_bytes").eq("version_id", draft.id);
    assets = await Promise.all((data ?? []).map(async (asset) => {
      const { data: signed } = await supabase.storage.from("menu-files").createSignedUrl(asset.storage_path, 60 * 60);
      return { path: asset.storage_path, name: asset.original_name, type: asset.content_type, size: asset.size_bytes, url: signed?.signedUrl };
    }));
  }

  return <main className="detail-page">
    <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><Link className="header-cta" href="/owner-dashboard">Owner dashboard <span>↗</span></Link></div></header>
    <section className="owner-menu-wrap">
      <Link className="back-link" href="/owner-dashboard">← Owner dashboard</Link>
      <p className="eyebrow">Menu studio · {restaurant.neighborhood}, Addis Ababa</p>
      <h1>{restaurant.name}<br /><em>menu.</em></h1>
      {restaurant.status === "suspended" ? <div className="owner-dashboard-card"><span>!</span><div><strong>Menu editing is unavailable.</strong><p>Contact the Yene Menu team if you need help with this restaurant listing.</p></div></div> : <>
        {restaurant.status !== "approved" ? <div className="admin-notice">Your restaurant listing is still under review. You can prepare structured dishes and upload menu photos or PDFs here; the menu stays private and cannot be published until the restaurant is approved.</div> : published?.status === "hidden" ? <div className="admin-notice error">Your last confirmed menu is temporarily hidden while the Yene Menu team reviews a report. You can prepare an updated draft below.</div> : <div className="owner-menu-status"><span className="check-dot">✓</span>{published?.confirmed_at ? `Current public menu confirmed ${new Date(published.confirmed_at).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa", day: "numeric", month: "long", year: "numeric" })}` : "No public menu yet. Your first confirmed menu will appear on your listing."}</div>}
        {draft ? <MenuEditor restaurantId={restaurant.id} versionId={draft.id} initialContent={(draft.content as MenuContent | null) ?? { sections: [] }} initialAssets={assets} updatedAt={draft.updated_at} canPublish={restaurant.status === "approved"} /> : <form action={createMenuDraft} className="owner-menu-start"><input type="hidden" name="restaurantId" value={restaurant.id} /><span className="owner-message-icon">✳</span><h2>Make your menu yours.</h2><p>Add dishes and prices, upload a menu photo or PDF, or use both. You can review the whole menu before you confirm it for customers.</p><button className="owner-submit" type="submit">{published ? "Start a new menu version" : "Create your first menu"}<span>→</span></button></form>}
      </>}
    </section>
    <footer className="site-footer detail-footer"><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Your draft stays private until you confirm it.</span></div></footer>
  </main>;
}
