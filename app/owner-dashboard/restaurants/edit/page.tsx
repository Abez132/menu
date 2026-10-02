import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteRejectedRestaurant, updateRestaurantAndRequestReview, signOutOwner } from "@/app/owner-dashboard/actions";

const categories = ["Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy", "Other"];
const neighborhoods = ["Bole", "Kazanchis", "Piazza", "Sarbet", "Old Airport", "Mexico", "Kirkos", "Other"];

export default async function EditRejectedRestaurantPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string; error?: string }> }) {
  const query = await searchParams;
  if (!query.restaurantId || !/^[0-9a-f-]{36}$/i.test(query.restaurantId)) redirect("/owner-dashboard");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/for-restaurants/sign-in");
  const { data: restaurant } = await supabase.from("restaurants").select("id, name, category, neighborhood, street_address, description, public_phone, website_url, cover_image_path, status").eq("id", query.restaurantId).eq("owner_id", user.id).in("status", ["approved", "rejected", "pending_review"]).maybeSingle();
  if (!restaurant) redirect("/owner-dashboard");
  const { data: coverPreview } = restaurant.cover_image_path ? await supabase.storage.from("restaurant-images").createSignedUrl(restaurant.cover_image_path, 60 * 60) : { data: null };

  const errorMessage = query.error === "invalid" ? "Check the required fields and try again." : query.error === "image" ? "Choose a JPG, PNG, or WebP cover photo under 5 MB." : query.error === "upload" ? "We couldn’t upload that photo. Check your Supabase storage setup and try again." : query.error === "not-owner" ? "This account is not verified to manage this listing." : query.error === "save" ? "We couldn’t update this request. Refresh and try again." : null;
  const statusCopy = restaurant.status === "approved"
    ? { eyebrow: "Published listing · edits need review", intro: "Edit your restaurant details or cover photo. Saving changes sends the listing back for administrator review and temporarily removes it from the public site.", callout: "This listing is currently published.", privacy: "After saving, it will be hidden from diners until it is approved again.", button: "Save changes and request review" }
    : restaurant.status === "rejected"
      ? { eyebrow: "Rejected request · private from diners", intro: "Correct the details and send the listing for administrator review again.", callout: "This listing was rejected.", privacy: "It remains private until approved.", button: "Save changes and resubmit" }
      : { eyebrow: "Listing under review · private from diners", intro: "Update your restaurant details or retry its cover photo upload. Your listing will remain in the review queue.", callout: "This listing is awaiting review.", privacy: "It remains private until approved.", button: "Save changes" };

  return <main className="detail-page">
    <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><div className="admin-header-actions"><Link className="header-cta" href="/owner-dashboard">Dashboard <span>↗</span></Link><form action={signOutOwner}><button className="header-cta owner-signout" type="submit">Sign out <span>↗</span></button></form></div></div></header>
    <section className="owner-signup-wrap add-restaurant-wrap">
      <div className="owner-signup-intro"><Link className="back-link" href="/owner-dashboard">← Owner dashboard</Link><p className="eyebrow">{statusCopy.eyebrow}</p><h1>Update your<br /><em>restaurant.</em></h1><p>{statusCopy.intro}</p><div className="rejected-callout"><strong>{statusCopy.callout}</strong><span>{statusCopy.privacy}</span></div></div>
      <div className="rejected-edit-stack">
        <form className="owner-form" action={updateRestaurantAndRequestReview}>
          <input type="hidden" name="restaurantId" value={restaurant.id} />
          <div className="owner-form-heading"><span>EDIT RESTAURANT DETAILS</span><h2>{restaurant.name}</h2><p>Signed in as {user.email}</p></div>
          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <div className="form-grid"><label className="form-field form-field-wide">Restaurant name <span>*</span><input name="restaurantName" required minLength={2} maxLength={100} defaultValue={restaurant.name} /></label><label className="form-field">Food type <span>*</span><select name="category" required defaultValue={restaurant.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field">Neighbourhood <span>*</span><select name="neighborhood" required defaultValue={restaurant.neighborhood}>{neighborhoods.map((area) => <option key={area}>{area}</option>)}</select></label><label className="form-field form-field-wide">Street address <span>*</span><input name="address" required maxLength={240} defaultValue={restaurant.street_address} /></label><label className="form-field form-field-wide">A little about your place<textarea name="description" maxLength={600} rows={3} defaultValue={restaurant.description ?? ""} /></label><label className="form-field">Public phone <small>Optional</small><input name="phone" type="tel" maxLength={40} defaultValue={restaurant.public_phone ?? ""} /></label><label className="form-field">Website <small>Optional</small><input name="website" type="url" maxLength={300} defaultValue={restaurant.website_url ?? ""} /></label><label className="form-field form-field-wide">Restaurant cover photo <small>Optional · JPG, PNG, or WebP under 5 MB</small>{coverPreview?.signedUrl && <img className="restaurant-cover-preview" src={coverPreview.signedUrl} alt={`Current photo of ${restaurant.name}`} />}<input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" /></label></div>
          <button className="owner-submit" type="submit">{statusCopy.button}<span>↗</span></button>
        </form>
        {restaurant.status === "rejected" && <form className="rejected-delete-box" action={deleteRejectedRestaurant}><input type="hidden" name="restaurantId" value={restaurant.id} /><strong>Delete this request</strong><p>Deleting the rejected listing is permanent. It removes the restaurant request and its related records.</p><label><input type="checkbox" name="confirmDelete" required /> I understand this request will be permanently deleted.</label><button type="submit">Delete rejected request</button></form>}
      </div>
    </section>
    <footer className="site-footer detail-footer"><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Your restaurant details are private until approved.</span></div></footer>
  </main>;
}
