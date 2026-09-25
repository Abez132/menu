"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInOwner, type OwnerAuthState } from "../actions";

const initialState: OwnerAuthState = {};

export default function OwnerSignInPage() {
  const [state, action, pending] = useActionState(signInOwner, initialState);
  return (
    <main className="detail-page">
      <header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><Link className="header-cta" href="/for-restaurants">List your restaurant <span>↗</span></Link></div></header>
      <section className="owner-signin-wrap"><p className="eyebrow">Welcome back</p><h1>Your restaurant,<br /><em>right this way.</em></h1><p>Sign in to continue managing your Yene Menu listing.</p><form className="owner-form signin-form" action={action}>{state.error && <p className="form-error" role="alert">{state.error}</p>}<label className="form-field">Email address<input type="email" name="email" autoComplete="email" required /></label><label className="form-field">Password<input type="password" name="password" autoComplete="current-password" required /></label><button className="owner-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}<span>↗</span></button><p className="owner-form-signin">New to Yene Menu? <Link href="/for-restaurants">Create a restaurant account</Link></p></form></section>
      <footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/">Back to home ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Menu details provided by restaurants.</span></div></footer>
    </main>
  );
}
