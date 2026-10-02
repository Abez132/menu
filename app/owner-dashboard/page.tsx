import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutOwner } from "./actions";

const statusLabels: Record<string, string> = {
  pending_review: "Awaiting administrator review",
  approved: "Listing approved",
  rejected: "Changes requested",
  suspended: "Listing unavailable",
};

export default async function OwnerDashboardPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const ownerName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "restaurant owner";

  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, neighborhood, status, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><div className="admin-header-actions">{isAdmin && <Link className="header-cta" href="/admin">Admin review <span>↗</span></Link>}<form action={signOutOwner}><button className="header-cta owner-signout" type="submit">Sign out <span>↗</span></button></form></div></div></header>
      <section className="owner-dashboard-wrap">
        <p className="eyebrow">Your Yene Menu account</p><h1>Welcome,<br /><em>{ownerName}.</em></h1><p className="owner-dashboard-email">Signed in as {user.email}</p>
        {query.added && <p className="admin-notice success" role="status">Your restaurant has been submitted for administrator review.</p>}
        {!isAdmin && !error && <div className="owner-dashboard-actions"><Link className="owner-add-restaurant" href="/owner-dashboard/restaurants/new"><span aria-hidden="true">＋</span> {restaurants?.length ? "Add another restaurant" : "Add your first restaurant"}</Link></div>}
        {error ? <div className="owner-dashboard-card"><span>!</span><div><strong>We couldn’t load your restaurants.</strong><p>Please refresh the page. If the problem continues, contact the Yene Menu team.</p></div></div> : restaurants?.length ? <div className="owner-restaurant-list">{restaurants.map((restaurant) => <article className="owner-dashboard-card" key={restaurant.id}>
          <span>{restaurant.status === "approved" ? "✓" : restaurant.status === "pending_review" ? "◷" : "!"}</span>
          <div><small>{restaurant.neighborhood} · Addis Ababa</small><strong>{restaurant.name}</strong><p className="status-pill">{statusLabels[restaurant.status] ?? "Listing status unavailable"}</p><p>{restaurant.status === "approved" ? "Your restaurant is public. Manage its dishes, prices, and menu files here." : "This listing stays private until it has been approved by an administrator."}</p>
            {restaurant.status === "approved" && <div className="owner-restaurant-links"><Link className="owner-page-link" href={`/owner-dashboard/menu?restaurantId=${restaurant.id}`}>Manage menu →</Link><Link className="owner-page-link" href={`/restaurants/${restaurant.slug}`} target="_blank">View public page ↗</Link></div>}
          </div>
        </article>)}</div> : <div className="owner-dashboard-card"><span>✳</span><div><strong>No restaurant listings yet.</strong><p>Add a restaurant to send it to the Yene Menu review queue.</p></div></div>}
      </section>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/">Back to home ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Your owner account details are private.</span></div></footer>
    </main>
  );
}
