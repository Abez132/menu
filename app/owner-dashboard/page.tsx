import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutOwner } from "./actions";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const ownerName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "restaurant owner";

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("name, neighborhood, status, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><form action={signOutOwner}><button className="header-cta owner-signout" type="submit">Sign out <span>↗</span></button></form></div></header>
      <section className="owner-dashboard-wrap"><p className="eyebrow">Your Yene Menu account</p><h1>Welcome,<br /><em>{ownerName}.</em></h1><p className="owner-dashboard-email">Signed in as {user.email}</p>
        {error ? <div className="owner-dashboard-card"><span>!</span><div><strong>We couldn’t load your listing.</strong><p>Please refresh the page. If the problem continues, contact the Yene Menu team.</p></div></div> : restaurant ? <div className="owner-dashboard-card"><span>{restaurant.status === "approved" ? "✓" : "◷"}</span><div><small>{restaurant.neighborhood} · Addis Ababa</small><strong>{restaurant.name}</strong><p className="status-pill">{restaurant.status === "pending_review" ? "Awaiting administrator review" : restaurant.status === "approved" ? "Listing approved" : restaurant.status === "rejected" ? "Changes requested" : "Listing unavailable"}</p><p>{restaurant.status === "approved" ? "Your listing is public. Menu editing and uploads are coming in the next build part." : "Your listing stays private until it has been reviewed by an administrator."}</p></div></div> : <div className="owner-dashboard-card"><span>✳</span><div><strong>No restaurant listing found yet.</strong><p>Start your restaurant listing and verify the owner email address to send it for review.</p><Link className="owner-page-link" href="/for-restaurants">Add your restaurant →</Link></div></div>}
      </section>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/">Back to home ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Your owner account details are private.</span></div></footer>
    </main>
  );
}
