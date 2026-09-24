import Link from "next/link";

export const metadata = { title: "For restaurants — Yene Menu" };

export default function ForRestaurantsPage() {
  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><nav className="main-nav"><Link href="/#restaurants">Explore menus</Link><Link href="/#how-it-works">How it works</Link></nav><Link className="header-cta" href="/">Home <span>↗</span></Link></div></header>
      <section className="owner-page"><p className="eyebrow">For the people behind the plates</p><h1>Your food deserves<br />to be <em>found.</em></h1><p>Yene Menu is being built to help people in Addis Ababa discover your restaurant and see your menu before they visit.</p><div className="owner-page-card"><span>✳</span><div><strong>Restaurant sign-up is the next build part.</strong><p>We’re preparing owner accounts, menu editing, photo and PDF uploads, and the review step for new listings.</p></div></div><Link className="owner-page-link" href="/">← Back to restaurant menus</Link></section>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/">Back to home ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Made with care, and a little appetite <b>✳</b></span></div></footer>
    </main>
  );
}
