import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBirr, restaurants } from "@/lib/restaurants";

export function generateStaticParams() {
  return restaurants.map((restaurant) => ({ slug: restaurant.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = restaurants.find((item) => item.slug === slug);
  return { title: restaurant ? `${restaurant.name} menu — Yene Menu` : "Restaurant — Yene Menu" };
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = restaurants.find((item) => item.slug === slug);
  if (!restaurant) notFound();

  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><nav className="main-nav"><Link href="/#restaurants">Explore menus</Link><Link href="/for-restaurants">For restaurants</Link></nav><Link className="header-cta" href="/#restaurants">Back to explore <span>↗</span></Link></div></header>
      <div className="detail-wrap">
        <Link className="back-link" href="/#restaurants">← All restaurants</Link>
        <div className="detail-hero"><div className="detail-photo" style={{ backgroundImage: `url("${restaurant.image}")` }} role="img" aria-label={restaurant.imageAlt}><span className="photo-category">{restaurant.category}</span><span className="detail-rating">★ {restaurant.rating} <i>·</i> {restaurant.priceLevel}</span></div><div className="detail-summary"><p className="eyebrow"><span className="location-pin">⌖</span> {restaurant.area}, Addis Ababa</p><h1>{restaurant.name}</h1><p>{restaurant.description}</p><div className="detail-quick"><span><i>⌖</i>{restaurant.area}</span><span><i>◷</i>{restaurant.hours.replace("Open today · ", "")}</span><span><i>◉</i>{restaurant.phone}</span></div><div className="detail-verified"><span>✓</span><div><strong>Menu checked by the restaurant</strong><small>Last confirmed {restaurant.updated}</small></div></div></div></div>
        <div className="menu-heading"><div><p className="eyebrow">A seat at the table</p><h2>On the <em>menu.</em></h2></div><span>Prices in Ethiopian birr · ETB</span></div>
        <div className="menu-content">{restaurant.menu.map((section) => <section className="menu-section" key={section.name}><div className="menu-section-heading"><h3>{section.name}</h3><span>{section.items.length} items</span></div><div className="menu-items">{section.items.map((item) => <article className="menu-item" key={item.name}><div><div className="menu-item-name"><h4>{item.name}</h4>{item.tags?.map((tag) => <span className="item-tag" key={tag}>{tag}</span>)}</div><p>{item.description}</p></div><strong className="menu-price">{formatBirr(item.price)}</strong></article>)}</div></section>)}</div>
        <p className="detail-disclaimer">Menu shared by the restaurant. Items and prices may change; please check with the restaurant before ordering.</p>
      </div>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/#restaurants">Back to explore ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Menu details provided by restaurants.</span></div></footer>
    </main>
  );
}
