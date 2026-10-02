import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addAnotherRestaurant, signOutOwner } from "@/app/owner-dashboard/actions";

export default async function AddRestaurantPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: verifiedOwner } = await supabase.rpc("is_verified_owner");
  if (!verifiedOwner) redirect("/owner-dashboard");

  const errorMessage = query.error === "invalid"
    ? "Check the required fields and try again."
    : query.error === "image"
      ? "Choose a JPG, PNG, or WebP photo under 5 MB."
    : query.error === "not-owner"
      ? "This account cannot submit an owner listing. Sign in with a verified restaurant owner account."
      : query.error === "save"
        ? "We couldn’t submit this restaurant. Please try again."
        : null;

  return <main className="detail-page">
    <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><div className="admin-header-actions"><Link className="header-cta" href="/owner-dashboard">Dashboard <span>↗</span></Link><form action={signOutOwner}><button className="header-cta owner-signout" type="submit">Sign out <span>↗</span></button></form></div></div></header>
    <section className="owner-signup-wrap add-restaurant-wrap">
      <div className="owner-signup-intro"><Link className="back-link" href="/owner-dashboard">← Owner dashboard</Link><p className="eyebrow">A new place at your table</p><h1>Add another<br /><em>restaurant.</em></h1><p>This listing will be sent to the Yene Menu team for review. Your other restaurant listings will not be affected.</p><div className="owner-signup-note"><span>✳</span><p><strong>One owner account, multiple listings.</strong><br />Each restaurant has its own approval status and its own menu.</p></div></div>
      <form className="owner-form" action={addAnotherRestaurant}>
        <div className="owner-form-heading"><span>RESTAURANT DETAILS</span><h2>Tell us about this place.</h2><p>Submitted as {user.email}</p></div>
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        <div className="form-grid"><label className="form-field form-field-wide">Restaurant name <span>*</span><input name="restaurantName" required minLength={2} maxLength={100} placeholder="The name diners know you by" /></label><label className="form-field">Food type <span>*</span><select name="category" required defaultValue=""><option value="" disabled>Choose a category</option><option>Ethiopian</option><option>Café &amp; brunch</option><option>Grill</option><option>Italian</option><option>Healthy</option><option>Other</option></select></label><label className="form-field">Neighbourhood <span>*</span><select name="neighborhood" required defaultValue=""><option value="" disabled>Choose an area</option><option>Bole</option><option>Kazanchis</option><option>Piazza</option><option>Sarbet</option><option>Old Airport</option><option>Mexico</option><option>Kirkos</option><option>Other</option></select></label><label className="form-field form-field-wide">Street address <span>*</span><input name="address" required maxLength={240} placeholder="Street, building, or nearby landmark" /></label><label className="form-field form-field-wide">A little about your place<textarea name="description" maxLength={600} rows={3} placeholder="What should people know about your food or atmosphere?" /></label><label className="form-field">Public phone <small>Optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="+251 …" /></label><label className="form-field">Website <small>Optional</small><input name="website" type="url" maxLength={300} placeholder="https://…" /></label><label className="form-field form-field-wide">Restaurant cover photo <small>Optional · JPG, PNG, or WebP under 5 MB</small><input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" /></label></div>
        <button className="owner-submit" type="submit">Submit for review <span>↗</span></button>
        <p className="owner-form-privacy">This new restaurant will stay private until an administrator approves it.</p>
      </form>
    </section>
    <footer className="site-footer detail-footer"><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Restaurant details provided by owners.</span></div></footer>
  </main>;
}
