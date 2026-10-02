"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendOwnerConfirmation, type OwnerAuthState } from "../actions";

const initialState: OwnerAuthState = {};

export default function CheckOwnerEmailPage() {
  const [state, action, pending] = useActionState(resendOwnerConfirmation, initialState);
  return (
    <main className="detail-page"><header className="site-header detail-header"><div className="header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><Link className="header-cta" href="/">Home <span>↗</span></Link></div></header><section className="owner-message-page"><span className="owner-message-icon">✉</span><p className="eyebrow">One quick check</p><h1>Check your<br /><em>inbox.</em></h1><p>Verify your email address to finish submitting your restaurant listing for administrator review.</p><div className="owner-signup-note"><span>✳</span><p><strong>What happens next?</strong><br />Once you confirm your email, your restaurant listing is submitted. It stays private until an administrator approves it.</p></div><form className="resend-confirmation-form" action={action}><label className="form-field" htmlFor="resend-email">Didn’t get the email? Enter your signup email to request another link.<input id="resend-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@restaurant.com" /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="menu-action-message success" role="status">{state.success}</p>}<button className="owner-submit" type="submit" disabled={pending}>{pending ? "Requesting email…" : "Resend confirmation email"}<span>↗</span></button></form><p className="resend-delivery-note">If you’re testing with an address outside your Supabase team, configure custom SMTP in Supabase Auth. The built-in mail service is limited to team addresses and has a low sending limit.</p><Link className="owner-page-link" href="/for-restaurants/sign-in">Already verified? Sign in →</Link></section><footer className="site-footer detail-footer"><div className="footer-top"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><span /></span><span>yene<span className="brand-menu">menu</span></span></Link><p>A little closer to your next<br />favourite meal.</p><Link href="/">Back to home ↑</Link></div><div className="footer-bottom"><span>© 2026 Yene Menu · Addis Ababa</span><span>Menu details provided by restaurants.</span></div></footer></main>
  );
}
