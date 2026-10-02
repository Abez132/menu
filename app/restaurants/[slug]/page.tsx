import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBirr, restaurants } from "@/lib/restaurants";
import { createClient } from "@/lib/supabase/server";
import type { MenuContent } from "@/lib/menu-types";
import { MenuReportForm } from "../menu-report-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let restaurant = restaurants.find((item) => item.slug === slug);
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("restaurants").select("name").eq("slug", slug).eq("status", "approved").maybeSingle();
    if (data) restaurant = { ...restaurant!, name: data.name };
  } catch { /* Public preview restaurants work before Supabase is configured. */ }
  return { title: restaurant ? `${restaurant.name} menu — Yene Menu` : "Restaurant — Yene Menu" };
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sampleRestaurant = restaurants.find((item) => item.slug === slug);
  let liveRestaurant: { id: string; name: string; slug: string; category: string; neighborhood: string; description: string; public_phone: string | null; cover_image_path: string | null } | null = null;
  let liveCoverUrl: string | undefined;
  let liveMenu: { id: string; content: unknown; confirmed_at: string | null } | null = null;
  let liveFiles: { storage_path: string; original_name: string; content_type: string; url?: string }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("restaurants").select("id, name, slug, category, neighborhood, description, public_phone, cover_image_path").eq("slug", slug).eq("status", "approved").maybeSingle();
    liveRestaurant = data;
    if (liveRestaurant) {
      if (liveRestaurant.cover_image_path) {
        const { data: signed } = await supabase.storage.from("restaurant-images").createSignedUrl(liveRestaurant.cover_image_path, 60 * 60);
        liveCoverUrl = signed?.signedUrl;
      }
      const { data: menu } = await supabase.from("menu_versions").select("id, content, confirmed_at").eq("restaurant_id", liveRestaurant.id).eq("status", "published").maybeSingle();
      liveMenu = menu;
    }
    if (liveMenu) {
      const { data: files } = await supabase.from("menu_assets").select("storage_path, original_name, content_type").eq("version_id", liveMenu.id);
      liveFiles = files ? await Promise.all(files.map(async (asset) => {
        const { data: signed } = await supabase.storage.from("menu-files").createSignedUrl(asset.storage_path, 60 * 60);
        return { ...asset, url: signed?.signedUrl };
      })) : [];
    }
  } catch { /* Keep sample menus available before Supabase is connected. */ }
  const liveContent = liveMenu?.content as MenuContent | undefined;
  const restaurant = sampleRestaurant;
  if (!liveRestaurant && !restaurant) notFound();

  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><nav className="main-nav"><Link href="/#restaurants">Explore menus</Link><Link href="/for-restaurants">For restaurants</Link></nav><Link className="header-cta" href="/#restaurants">Back to explore <span>↗</span></Link></div></header>
      <div className="detail-wrap">
        <Link className="back-link" href="/#restaurants">← All restaurants</Link>
        {liveRestaurant ? <div className="detail-hero"><div className="detail-photo live-detail-photo" style={liveCoverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(20,24,17,.05), rgba(20,24,17,.50)), url("${liveCoverUrl}")` } : undefined}><span className="photo-category">{liveRestaurant.category}</span><span className="detail-rating">Addis Ababa <i>·</i> ETB</span></div><div className="detail-summary"><p className="eyebrow"><span className="location-pin">⌖</span> {liveRestaurant.neighborhood}, Addis Ababa</p><h1>{liveRestaurant.name}</h1><p>{liveRestaurant.description}</p><div className="detail-quick"><span><i>⌖</i>{liveRestaurant.neighborhood}</span>{liveRestaurant.public_phone && <span><i>◉</i>{liveRestaurant.public_phone}</span>}</div>{liveMenu?.confirmed_at && <div className="detail-verified"><span>✓</span><div><strong>Menu checked by the restaurant</strong><small>Last confirmed {new Date(liveMenu.confirmed_at).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa", day: "numeric", month: "long", year: "numeric" })}</small></div></div>}</div></div> : <div className="detail-hero"><div className="detail-photo" style={{ backgroundImage: `url("${restaurant!.image}")` }} role="img" aria-label={restaurant!.imageAlt}><span className="photo-category">{restaurant!.category}</span><span className="detail-rating">★ {restaurant!.rating} <i>·</i> {restaurant!.priceLevel}</span></div><div className="detail-summary"><p className="eyebrow"><span className="location-pin">⌖</span> {restaurant!.area}, Addis Ababa</p><h1>{restaurant!.name}</h1><p>{restaurant!.description}</p><div className="detail-quick"><span><i>⌖</i>{restaurant!.area}</span><span><i>◷</i>{restaurant!.hours.replace("Open today · ", "")}</span><span><i>◉</i>{restaurant!.phone}</span></div><div className="detail-verified"><span>✓</span><div><strong>Menu checked by the restaurant</strong><small>Last confirmed {restaurant!.updated}</small></div></div></div></div>}
        <div className="menu-heading"><div><p className="eyebrow">A seat at the table</p><h2>On the <em>menu.</em></h2></div><span>Prices in Ethiopian birr · ETB</span></div>
        <div className="menu-content">
          {liveRestaurant ? liveContent?.sections?.map((section, sectionIndex) => (
            <section className="menu-section" key={`${section.name}-${sectionIndex}`}>
              <div className="menu-section-heading"><h3>{section.name}</h3><span>{section.items.length} items</span></div>
              <div className="menu-items">{section.items.map((item, itemIndex) => (
                <article className="menu-item" key={`${item.name}-${itemIndex}`}>
                  <div><div className="menu-item-name"><h4>{item.name}</h4>{item.tags?.map((tag) => <span className="item-tag" key={tag}>{tag}</span>)}</div>{item.description && <p>{item.description}</p>}</div>
                  <strong className="menu-price">{formatBirr(item.price)}</strong>
                </article>
              ))}</div>
            </section>
          )) : (
            <section className="menu-section">
              <div className="menu-section-heading"><h3>Full menu</h3><span>{restaurant!.menu.length} items</span></div>
              <div className="menu-items">{restaurant!.menu.map((item) => (
                <article className="menu-item" key={item.name}>
                  <div><div className="menu-item-name"><h4>{item.name}</h4>{item.tags?.map((tag) => <span className="item-tag" key={tag}>{tag}</span>)}</div><p>{item.description}</p></div>
                  <strong className="menu-price">{formatBirr(item.price)}</strong>
                </article>
              ))}</div>
            </section>
          )}
        </div>
        {liveRestaurant && liveFiles.map((file) => file.url ? file.content_type.startsWith("image/") ? <a className="public-menu-image-link" href={file.url} target="_blank" rel="noreferrer" key={file.storage_path}><img className="public-menu-image" src={file.url} alt={`${liveRestaurant.name} menu: ${file.original_name}`} /><span>{file.original_name}</span></a> : <a className="public-menu-pdf" href={file.url} target="_blank" rel="noreferrer" key={file.storage_path}><span>PDF</span><strong>{file.original_name}</strong><small>Open the restaurant menu file ↗</small></a> : null)}
        {liveRestaurant && !liveMenu && <div className="menu-empty-public"><strong>The restaurant is setting up its menu.</strong><p>Please check back soon or contact the restaurant directly.</p></div>}
        <p className="detail-disclaimer">Menu shared by the restaurant. Items and prices may change; please check with the restaurant before ordering.</p>
        {liveRestaurant && liveMenu && <details className="menu-report-details"><summary>Report an issue with this menu</summary><p>Tell us what looks wrong and we’ll review it.</p><MenuReportForm restaurantId={liveRestaurant.id} versionId={liveMenu.id} /></details>}
      </div>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/#restaurants">Back to explore ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Menu details provided by restaurants.</span></div></footer>
    </main>
  );
}
