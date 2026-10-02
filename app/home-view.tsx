"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories } from "@/lib/restaurants";

type ListingCard = {
  slug: string;
  name: string;
  category: string;
  area: string;
  image: string | null;
  imageAlt: string;
  rating: string | null;
  priceLevel: string | null;
  menuCount: number;
  updated: string;
};

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Yene Menu home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>yene<span className="brand-menu">menu</span></span>
    </Link>
  );
}

function RestaurantCard({ restaurant, index }: { restaurant: ListingCard; index: number }) {
  const photoStyle = restaurant.image ? { backgroundImage: `url("${restaurant.image}")` } : undefined;
  return (
    <Link className={`restaurant-card card-delay-${index % 3}`} href={`/restaurants/${restaurant.slug}`}>
      <div className={`card-photo${restaurant.image ? "" : " live-card-photo"}`} style={photoStyle} role="img" aria-label={restaurant.imageAlt}>
        <span className="photo-category">{restaurant.category}</span>
        {!restaurant.image && <span className="live-card-mark" aria-hidden="true">✳</span>}
        <span className="save-button" aria-hidden="true">♡</span>
      </div>
      <div className="card-content">
        <div className="card-title-row"><h3>{restaurant.name}</h3>{restaurant.rating && <span className="rating"><span>★</span> {restaurant.rating}</span>}</div>
        <p className="card-meta">{restaurant.area}<span>·</span>{restaurant.priceLevel ?? "ETB"}<span>·</span>{restaurant.menuCount ? `${restaurant.menuCount} dishes` : "Photo / PDF menu"}</p>
        <div className="card-bottom"><span className="checked"><span className="check-dot">✓</span> Menu checked {restaurant.updated}</span><span className="card-arrow">↗</span></div>
      </div>
    </Link>
  );
}

export default function Home({ restaurants, isPreview }: { restaurants: ListingCard[]; isPreview: boolean }) {
  const [activeCategory, setActiveCategory] = useState("All menus");
  const [query, setQuery] = useState("");
  const filteredRestaurants = useMemo(() => restaurants.filter((restaurant) => {
    const matchesCategory = activeCategory === "All menus" || restaurant.category === activeCategory;
    const matchesQuery = `${restaurant.name} ${restaurant.area} ${restaurant.category}`.toLowerCase().includes(query.toLowerCase().trim());
    return matchesCategory && matchesQuery;
  }), [activeCategory, query]);

  return (
    <main>
      <div className="announcement"><span className="announcement-spark">✳</span> Addis Ababa, there's something good on the menu. <a href="#restaurants">Find your next bite <span>↗</span></a></div>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Main navigation"><a href="#restaurants">Explore menus</a><a href="#how-it-works">How it works</a></nav>
          <a className="header-cta" href="#restaurants">Find a table <span>↗</span></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span className="location-pin">⌖</span> A taste of Addis, all in one place</p>
            <h1>Good food starts<br />with <span>what's on</span><br />the menu.</h1>
            <p className="hero-description">Find your next favourite spot. See what's cooking, check the prices, and make a plan you feel good about.</p>
            <div className="hero-search-wrap">
            <label className="hero-search" htmlFor="restaurant-search"><span className="search-icon">⌕</span><input id="restaurant-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="A dish, a place, a craving…" /><button type="button" onClick={() => document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth" })}>Explore <span>↗</span></button></label>
              <p className="search-footnote"><span>✳</span> Thoughtfully gathered menus from around Addis Ababa</p>
            </div>
          </div>
          <div className="hero-art" aria-label="A table set for a delicious meal">
            <div className="hero-image-main"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=90" alt="A colourful meal shared around the table" /></div>
            <div className="hero-stamp"><span>Made for</span><strong>good<br />company</strong><span className="stamp-star">✳</span></div>
            <div className="hero-note"><span className="note-icon">✳</span><span><strong>Know before you go</strong><small>Prices, menus, sorted.</small></span></div>
            <div className="hero-scribble" aria-hidden="true">✳</div>
          </div>
          <div className="hero-index"><span>01</span><i /> YOUR CITY, YOUR TABLE</div>
        </div>
      </section>

      <section className="browse-section" id="restaurants">
        <div className="section-heading"><div><p className="eyebrow section-eyebrow">A little bit of everything</p><h2>Find your kind of <em>good.</em></h2></div><a className="text-link" href="#how-it-works">How Yene Menu works <span>↗</span></a></div>
        <div className="category-row" role="group" aria-label="Filter restaurants by food type">{categories.map((category) => <button className={`category-chip ${activeCategory === category ? "active" : ""}`} key={category} onClick={() => setActiveCategory(category)}>{category === "All menus" && <span className="chip-spark">✳</span>}{category}</button>)}</div>
        <div className="results-line"><span>{query ? `Results for “${query}”` : isPreview ? "A few local favourites" : restaurants.length ? "Menus to make a plan around" : "Addis Ababa menus"}</span><span>{filteredRestaurants.length} places <i>·</i> Addis Ababa</span></div>
        {filteredRestaurants.length ? <div className="restaurant-grid">{filteredRestaurants.map((restaurant, index) => <RestaurantCard key={restaurant.slug} restaurant={restaurant} index={index} />)}</div> : <div className="empty-state"><span>⌕</span><h3>{restaurants.length === 0 && !isPreview ? "Addis menus are on their way." : "No menus found just yet."}</h3><p>{restaurants.length === 0 && !isPreview ? "We’re getting Yene Menu ready. Check back soon, or add your restaurant to help diners discover it." : "Try a different dish, area, or category."}</p>{restaurants.length > 0 ? <button onClick={() => { setQuery(""); setActiveCategory("All menus"); }}>Clear filters</button> : !isPreview && <Link className="text-link" href="/for-restaurants">Add your restaurant <span>↗</span></Link>}</div>}
        {isPreview && <div className="preview-note"><span>✳</span> Preview menus — restaurant names and menu details are sample content for this early build.</div>}
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-inner"><div className="how-intro"><p className="eyebrow">Less guessing, more gathering</p><h2>Make room for<br /><em>something delicious.</em></h2><p>Yene Menu brings Addis menus together, so you can choose the place that feels right before you step out.</p></div>
          <div className="how-steps"><article><span className="step-number">01</span><span className="step-icon">⌕</span><h3>Find your mood</h3><p>Search by restaurant, neighbourhood, or the kind of food you have in mind.</p></article><article><span className="step-number">02</span><span className="step-icon">☷</span><h3>See the menu</h3><p>Get a feel for the dishes and prices before you decide where to go.</p></article><article><span className="step-number">03</span><span className="step-icon">♡</span><h3>Make it a plan</h3><p>Pick a place, bring your people, and enjoy a table worth finding.</p></article></div>
        </div>
      </section>

      <section className="owner-banner"><div className="owner-copy"><span className="owner-kicker">FOR THE PEOPLE BEHIND THE PLATES</span><h2>Your food deserves<br />to be <em>found.</em></h2><p>We're making it easier for people in Addis to discover what's on your menu.</p></div><div className="owner-action"><span className="owner-ornament">✳</span><Link href="/for-restaurants">I'm a restaurant owner <span>↗</span></Link><small>Add your restaurant to Yene Menu.</small></div></section>

      <footer className="site-footer"><div className="footer-top"><Brand /><p>A little closer to your next<br />favourite meal.</p><a href="#restaurants">Back to the top ↑</a></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Made with care, and a little appetite <b>✳</b></span><span>Menu details provided by restaurants.</span></div></footer>
    </main>
  );
}
