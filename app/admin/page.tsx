import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuContent } from "@/lib/menu-types";
import { signOutOwner } from "@/app/owner-dashboard/actions";
import { moderateMenuReport, moderateReportedMenu, moderateRestaurant, updateRestaurantDetails } from "./actions";

const listingStatuses = ["pending_review", "approved", "rejected", "suspended"] as const;
const reportStatuses = ["open", "investigating", "resolved", "dismissed"] as const;
const categoryOptions = ["Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy", "Other"];
const neighborhoodOptions = ["Bole", "Kazanchis", "Piazza", "Sarbet", "Old Airport", "Mexico", "Kirkos", "Other"];
const listingLabels: Record<string, string> = { pending_review: "Awaiting review", approved: "Published", rejected: "Declined", suspended: "Hidden" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; reportStatus?: string; saved?: string; error?: string }> }) {
  const query = await searchParams;
  const active = query.status === "reports" ? "reports" : listingStatuses.includes(query.status as typeof listingStatuses[number]) ? query.status! : "pending_review";
  const activeReport = reportStatuses.includes(query.reportStatus as typeof reportStatuses[number]) ? query.reportStatus! : "open";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: isAdmin, error: permissionError } = await supabase.rpc("is_admin");
  if (permissionError || !isAdmin) redirect("/owner-dashboard");

  const { data: counts } = await supabase.from("restaurants").select("status");
  const reportCount = await supabase.from("menu_reports").select("id", { count: "exact", head: true }).eq("status", "open");
  const statusCounts = Object.fromEntries(listingStatuses.map((status) => [status, (counts ?? []).filter((row) => row.status === status).length]));

  const { data: restaurantsToReview, error: restaurantError } = active !== "reports"
    ? await supabase.from("restaurants").select("id, owner_id, name, slug, category, neighborhood, street_address, description, public_phone, website_url, status, created_at").eq("status", active).order("created_at", { ascending: active === "pending_review" })
    : { data: [], error: null };
  const ownerIds = [...new Set((restaurantsToReview ?? []).map((restaurant) => restaurant.owner_id))];
  const { data: profiles } = ownerIds.length ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds) : { data: [] };
  const ownerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const { data: reports, error: reportError } = active === "reports"
    ? await supabase.from("menu_reports").select("id, restaurant_id, menu_version_id, issue_type, message, reporter_contact, status, admin_note, created_at").eq("status", activeReport).order("created_at", { ascending: true })
    : { data: [], error: null };
  const reportRestaurantIds = [...new Set((reports ?? []).map((report) => report.restaurant_id))];
  const { data: reportRestaurants } = reportRestaurantIds.length ? await supabase.from("restaurants").select("id, name, slug").in("id", reportRestaurantIds) : { data: [] };
  const reportRestaurantMap = new Map((reportRestaurants ?? []).map((restaurant) => [restaurant.id, restaurant]));
  const reportVersionIds = [...new Set((reports ?? []).map((report) => report.menu_version_id))];
  const { data: reportVersions } = reportVersionIds.length ? await supabase.from("menu_versions").select("id, status, content, confirmed_at").in("id", reportVersionIds) : { data: [] };
  const reportVersionMap = new Map((reportVersions ?? []).map((version) => [version.id, version]));
  const { data: reportAssets } = reportVersionIds.length ? await supabase.from("menu_assets").select("version_id, storage_path, original_name, content_type").in("version_id", reportVersionIds) : { data: [] };
  const signedReportAssets = await Promise.all((reportAssets ?? []).map(async (asset) => {
    const { data } = await supabase.storage.from("menu-files").createSignedUrl(asset.storage_path, 60 * 30);
    return { ...asset, url: data?.signedUrl ?? null };
  }));
  const reportAssetsByVersion = new Map<string, typeof signedReportAssets>();
  for (const asset of signedReportAssets) reportAssetsByVersion.set(asset.version_id, [...(reportAssetsByVersion.get(asset.version_id) ?? []), asset]);

  return <main className="detail-page admin-page">
    <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><div className="admin-header-actions"><span>Administrator</span><form action={signOutOwner}><button className="header-cta owner-signout" type="submit">Sign out <span>↗</span></button></form></div></div></header>
    <section className="admin-wrap">
      <p className="eyebrow">Yene Menu · Admin</p><h1>Review &amp;<br /><em>keep it current.</em></h1><p className="admin-intro">Approve restaurant listings, update public details, keep inaccurate listings hidden, and respond to menu reports.</p>
      {query.saved && <p className="admin-notice success" role="status">Your changes have been saved.</p>}
      {query.error && <p className="admin-notice error" role="alert">We couldn’t save that change. The listing may have changed; refresh and review it again.</p>}
      <nav className="admin-tabs" aria-label="Admin queues">
        {listingStatuses.map((status) => <Link className={active === status ? "active" : ""} href={`/admin?status=${status}`} key={status}>{listingLabels[status]} <span>{statusCounts[status] ?? 0}</span></Link>)}
        <Link className={active === "reports" ? "active" : ""} href="/admin?status=reports">Menu reports <span>{reportCount.count ?? 0}</span></Link>
      </nav>

      {active === "reports" ? <>
        <div className="admin-queue-heading"><div><p className="owner-kicker">DINER FEEDBACK</p><h2>Menu reports</h2></div><span>{reports?.length ?? 0} {activeReport.replace("_", " ")}</span></div>
        <nav className="admin-filter-row" aria-label="Report status">{reportStatuses.map((status) => <Link className={activeReport === status ? "active" : ""} href={`/admin?status=reports&reportStatus=${status}`} key={status}>{status}</Link>)}</nav>
        {reportError ? <div className="admin-empty"><strong>Reports could not be loaded.</strong><p>Refresh the page and try again.</p></div> : reports?.length ? <div className="admin-card-list">{reports.map((report) => {
          const restaurant = reportRestaurantMap.get(report.restaurant_id);
          const menuVersion = reportVersionMap.get(report.menu_version_id);
          const menuStatus = menuVersion?.status;
          const menuContent = menuVersion?.content as MenuContent | null;
          const menuSections = Array.isArray(menuContent?.sections) ? menuContent.sections : [];
          const attachedAssets = reportAssetsByVersion.get(report.menu_version_id) ?? [];
          return <article className="admin-card report-card" key={report.id}>
            <div className="admin-card-heading"><div><p className="owner-kicker">{report.issue_type.replaceAll("_", " ")}</p><h3>{restaurant?.name ?? "Restaurant listing"}</h3></div><span className={`admin-status status-${report.status}`}>{report.status}</span></div>
            <p className="report-message">{report.message}</p><p className="admin-meta">Received {new Date(report.created_at).toLocaleString("en-ET", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" })}{report.reporter_contact && <> · Reply contact: <a href={`mailto:${encodeURIComponent(report.reporter_contact)}`}>{report.reporter_contact}</a></>}</p>
            {restaurant?.slug && <Link className="admin-public-link" href={`/restaurants/${restaurant.slug}`} target="_blank">View public menu ↗</Link>}
            <details className="admin-edit-details report-menu-preview"><summary>Inspect reported menu</summary>
              {menuVersion?.confirmed_at && <p className="admin-meta">Owner confirmed {new Date(menuVersion.confirmed_at).toLocaleString("en-ET", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" })}</p>}
              {menuSections.length ? <div className="report-structured-menu">{menuSections.map((section, sectionIndex) => <section key={`${section.name}-${sectionIndex}`}><h4>{section.name}</h4>{Array.isArray(section.items) && section.items.length ? <ul>{section.items.map((item, itemIndex) => <li key={`${item.name}-${itemIndex}`}><span><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span><b>{item.price.toLocaleString("en-ET")} ETB</b></li>)}</ul> : <p className="admin-meta">No structured dishes in this section.</p>}</section>)}</div> : <p className="admin-meta">This version has no structured dishes.</p>}
              {attachedAssets.length > 0 && <div className="report-file-list"><h4>Uploaded menu files</h4>{attachedAssets.map((asset) => <p key={asset.storage_path}>{asset.content_type.startsWith("image/") && asset.url && <a href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={`Preview of ${asset.original_name}`} /></a>} {asset.url ? <a href={asset.url} target="_blank" rel="noreferrer">{asset.original_name} ↗</a> : <span>{asset.original_name} (preview unavailable)</span>}</p>)}</div>}
            </details>
            {menuStatus === "published" && <form action={moderateReportedMenu} className="admin-menu-visibility"><input type="hidden" name="versionId" value={report.menu_version_id} /><input type="hidden" name="visible" value="false" /><button className="admin-decline-button" type="submit">Hide this menu</button></form>}
            {menuStatus === "hidden" && <form action={moderateReportedMenu} className="admin-menu-visibility"><input type="hidden" name="versionId" value={report.menu_version_id} /><input type="hidden" name="visible" value="true" /><button className="admin-save-button" type="submit">Restore this menu <span>✓</span></button><small>Restoring it replaces any newer public menu.</small></form>}
            {menuStatus === "archived" && <p className="admin-meta">This report is for a menu version that has since been replaced.</p>}
            <form action={moderateMenuReport} className="admin-report-form"><input type="hidden" name="reportId" value={report.id} /><label className="form-field"><span>STATUS</span><select name="status" defaultValue={report.status}>{reportStatuses.map((status) => <option value={status} key={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label><label className="form-field"><span>PRIVATE ADMIN NOTE</span><textarea name="adminNote" rows={2} maxLength={1000} defaultValue={report.admin_note ?? ""} placeholder="What you checked or changed" /></label><button className="admin-save-button" type="submit">Save report update <span>→</span></button></form>
          </article>;
        })}</div> : <div className="admin-empty"><span>✓</span><strong>No {activeReport.replace("_", " ")} reports.</strong><p>New menu reports will appear here.</p></div>}
      </> : <>
        <div className="admin-queue-heading"><div><p className="owner-kicker">RESTAURANT LISTINGS</p><h2>{listingLabels[active]}</h2></div><span>{restaurantsToReview?.length ?? 0} {restaurantsToReview?.length === 1 ? "listing" : "listings"}</span></div>
        {restaurantError ? <div className="admin-empty"><strong>Restaurant listings could not be loaded.</strong><p>Refresh the page and try again.</p></div> : restaurantsToReview?.length ? <div className="admin-card-list">{restaurantsToReview.map((restaurant) => <article className="admin-card" key={restaurant.id}>
          <div className="admin-card-heading"><div><p className="owner-kicker">{restaurant.category} · {restaurant.neighborhood}</p><h3>{restaurant.name}</h3></div><span className={`admin-status status-${restaurant.status}`}>{listingLabels[restaurant.status]}</span></div>
          <p className="admin-card-description">{restaurant.description || "No description provided."}</p>
          <dl className="admin-facts"><div><dt>Address</dt><dd>{restaurant.street_address}</dd></div><div><dt>Owner</dt><dd>{ownerNames.get(restaurant.owner_id) || "Name not available"}</dd></div>{restaurant.public_phone && <div><dt>Public phone</dt><dd>{restaurant.public_phone}</dd></div>}{restaurant.website_url && <div><dt>Website</dt><dd><a href={restaurant.website_url} target="_blank" rel="noreferrer">{restaurant.website_url} ↗</a></dd></div>}<div><dt>Submitted</dt><dd>{new Date(restaurant.created_at).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium" })}</dd></div></dl>
          <div className="admin-card-actions">
            {(restaurant.status === "pending_review" || restaurant.status === "rejected") && <form action={moderateRestaurant}><input type="hidden" name="restaurantId" value={restaurant.id} /><button className="admin-save-button" name="intent" value="approve" type="submit">Approve listing <span>✓</span></button></form>}
            {restaurant.status === "pending_review" && <form action={moderateRestaurant}><input type="hidden" name="restaurantId" value={restaurant.id} /><button className="admin-decline-button" name="intent" value="reject" type="submit">Decline</button></form>}
            {restaurant.status === "approved" && <form action={moderateRestaurant}><input type="hidden" name="restaurantId" value={restaurant.id} /><button className="admin-decline-button" name="intent" value="suspend" type="submit">Hide listing</button></form>}
            {restaurant.status === "suspended" && <form action={moderateRestaurant}><input type="hidden" name="restaurantId" value={restaurant.id} /><button className="admin-save-button" name="intent" value="restore" type="submit">Restore listing <span>✓</span></button></form>}
            {restaurant.status === "approved" && <Link className="admin-public-link" href={`/restaurants/${restaurant.slug}`} target="_blank">View public page ↗</Link>}
          </div>
          <details className="admin-edit-details"><summary>Edit listing details</summary><form action={updateRestaurantDetails} className="admin-edit-form"><input type="hidden" name="restaurantId" value={restaurant.id} /><div className="form-grid"><label className="form-field"><span>RESTAURANT NAME</span><input name="name" required maxLength={100} defaultValue={restaurant.name} /></label><label className="form-field"><span>CATEGORY</span><select name="category" defaultValue={restaurant.category}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="form-field"><span>NEIGHBOURHOOD</span><select name="neighborhood" defaultValue={restaurant.neighborhood}>{neighborhoodOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label className="form-field"><span>STREET ADDRESS</span><input name="streetAddress" required maxLength={240} defaultValue={restaurant.street_address} /></label><label className="form-field form-field-wide"><span>DESCRIPTION</span><textarea name="description" maxLength={600} rows={3} defaultValue={restaurant.description} /></label><label className="form-field"><span>PUBLIC PHONE</span><input name="publicPhone" maxLength={40} defaultValue={restaurant.public_phone ?? ""} /></label><label className="form-field"><span>WEBSITE</span><input name="websiteUrl" type="url" maxLength={300} defaultValue={restaurant.website_url ?? ""} placeholder="https://" /></label></div><button className="admin-save-button" type="submit">Save listing details <span>→</span></button></form></details>
        </article>)}</div> : <div className="admin-empty"><span>✓</span><strong>No {listingLabels[active].toLowerCase()} listings.</strong><p>Restaurant submissions and status changes will show up here.</p></div>}
      </>}
    </section>
    <footer className="site-footer detail-footer"><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Admin tools are private to approved administrators.</span></div></footer>
  </main>;
}
