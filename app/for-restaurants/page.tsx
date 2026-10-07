"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpOwner, type OwnerAuthState } from "./actions";

const initialState: OwnerAuthState = {};

export default function ForRestaurantsPage() {
  const [state, action, pending] = useActionState(signUpOwner, initialState);
  return (
    <main className="detail-page">
      <header className="site-header detail-header">
        <div className="header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              yene<span className="brand-menu">menu</span>
            </span>
          </Link>
          <nav className="main-nav">
            <Link href="/#restaurants">Explore menus</Link>
            <Link href="/#how-it-works">How it works</Link>
          </nav>
          <Link className="header-cta" href="/for-restaurants/sign-in">
            Owner sign in <span>↗</span>
          </Link>
        </div>
      </header>
      <section className="owner-signup-wrap">
        <div className="owner-signup-intro">
          <p className="eyebrow">For the people behind the plates</p>
          <h1>
            Your food deserves
            <br />
            to be <em>found.</em>
          </h1>
          <p>
            Create your owner account and enter your restaurant details
            together. After you verify your email, we submit the restaurant
            listing for administrator review.
          </p>
          <div className="owner-signup-note">
            <span>✳</span>
            <p>
              <strong>You stay in control.</strong>
              <br />
              Your menu won’t be public until you confirm it, and your
              restaurant listing needs administrator approval first.
            </p>
          </div>
        </div>
        <form className="owner-form" action={action}>
          <div className="owner-form-heading">
            <span>CREATE AN OWNER ACCOUNT</span>
            <h2>Let’s get you listed.</h2>
            <p>
              Your restaurant application is submitted after you verify your
              email.
            </p>
          </div>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <div className="form-grid">
            <label className="form-field">
              Your name <span>*</span>
              <input
                name="fullName"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="e.g. Hana Bekele"
              />
            </label>
            <label className="form-field">
              Work email <span>*</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@restaurant.com"
              />
            </label>
            <label className="form-field form-field-wide">
              Password <span>*</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                placeholder="At least 10 characters"
              />
              <small>We’ll email you a link to verify this address.</small>
            </label>
          </div>
          <div className="owner-form-heading form-second-heading">
            <span>02 — YOUR RESTAURANT</span>
            <h2>Tell us what’s cooking.</h2>
          </div>
          <div className="form-grid">
            <label className="form-field form-field-wide">
              Restaurant name <span>*</span>
              <input
                name="restaurantName"
                required
                maxLength={100}
                placeholder="The name diners know you by"
              />
            </label>
            <label className="form-field">
              Food type <span>*</span>
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Choose a category
                </option>
                <option>Ethiopian</option>
                <option>Café &amp; brunch</option>
                <option>Grill</option>
                <option>Italian</option>
                <option>Healthy</option>
                <option>Other</option>
              </select>
            </label>
            <label className="form-field">
              Neighbourhood <span>*</span>
              <select name="neighborhood" required defaultValue="">
                <option value="" disabled>
                  Choose an area
                </option>
                <option>Bole</option>
                <option>Kazanchis</option>
                <option>Piazza</option>
                <option>Sarbet</option>
                <option>Old Airport</option>
                <option>Mexico</option>
                <option>Kirkos</option>
                <option>Other</option>
              </select>
            </label>
            <label className="form-field form-field-wide">
              Street address <span>*</span>
              <input
                name="address"
                required
                maxLength={240}
                placeholder="Street, building, or nearby landmark"
              />
            </label>
            <label className="form-field form-field-wide">
              A little about your place
              <textarea
                name="description"
                maxLength={600}
                rows={3}
                placeholder="What should people know about your food or atmosphere?"
              />
            </label>
            <label className="form-field">
              Public phone <small>Optional</small>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                placeholder="+251 …"
              />
            </label>
            <label className="form-field">
              Website <small>Optional</small>
              <input
                name="website"
                type="url"
                maxLength={300}
                placeholder="https://…"
              />
            </label>
          </div>
          <button className="owner-submit" type="submit" disabled={pending}>
            {pending
              ? "Creating your account…"
              : "Create account & verify email"}
            <span>↗</span>
          </button>
          <p className="owner-form-privacy">
            Your login email is private. Only the restaurant details you choose
            to share will appear on Yene Menu.
          </p>
          <p className="owner-form-signin">
            Already signed up?{" "}
            <Link href="/for-restaurants/check-email">
              Resend your confirmation email
            </Link>{" "}
            · <Link href="/for-restaurants/sign-in">Sign in</Link>
          </p>
        </form>
      </section>
      <footer className="site-footer detail-footer">
        <div className="footer-top">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>
              yene<span className="brand-menu">menu</span>
            </span>
          </Link>
          <p>
            A little closer to your next
            <br />
            favourite meal.
          </p>
          <Link href="/">Back to home ↑</Link>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Yene Menu · Addis Ababa</span>
          <span>Menu details provided by restaurants.</span>
        </div>
      </footer>
    </main>
  );
}
