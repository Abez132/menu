"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OwnerAuthState = { error?: string; success?: string };
const categories = new Set(["Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy", "Other"]);
const neighborhoods = new Set(["Bole", "Kazanchis", "Piazza", "Sarbet", "Old Airport", "Mexico", "Kirkos", "Other"]);

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function signUpOwner(_state: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const restaurantName = value(formData, "restaurantName");
  const category = value(formData, "category");
  const neighborhood = value(formData, "neighborhood");
  const address = value(formData, "address");
  const description = value(formData, "description");
  const phone = value(formData, "phone");
  const website = value(formData, "website");

  if (!fullName || !email || !password || !restaurantName || !category || !neighborhood || !address) {
    return { error: "Please fill in all required fields." };
  }
  if (fullName.length > 100 || email.length > 254 || password.length > 128 || phone.length > 40 || website.length > 300) {
    return { error: "Some information is too long. Please shorten it and try again." };
  }
  if (password.length < 10) return { error: "Choose a password with at least 10 characters." };
  if (!categories.has(category)) return { error: "Choose a restaurant category from the list." };
  if (!neighborhoods.has(neighborhood)) return { error: "Choose a neighbourhood from the list." };
  if (restaurantName.length > 100 || address.length > 240 || description.length > 600) {
    return { error: "Some information is too long. Please shorten it and try again." };
  }
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (parsedWebsite.protocol !== "https:" && parsedWebsite.protocol !== "http:") throw new Error("Invalid protocol");
    } catch {
      return { error: "Enter a complete website link beginning with https://, or leave it blank." };
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { error: "The site address is not configured yet. Please try again later." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm`,
        data: {
          full_name: fullName,
          pending_restaurant: {
            name: restaurantName,
            category,
            neighborhood,
            street_address: address,
            description,
            public_phone: phone || null,
            website_url: website || null,
          },
        },
      },
    });

    if (error) return { error: "We couldn't create the account. Check the details and try again." };
  } catch {
    return { error: "Restaurant sign-up isn't connected yet. The site owner needs to finish Supabase setup." };
  }

  redirect("/for-restaurants/check-email");
}

export async function signInOwner(_state: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Those sign-in details didn't work. Check them and try again." };
  } catch {
    return { error: "Restaurant sign-in isn't connected yet. The site owner needs to finish Supabase setup." };
  }

  redirect("/owner-dashboard");
}

export async function resendOwnerConfirmation(_state: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const email = value(formData, "email").toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter the email address you used to create your owner account." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { error: "Email confirmation isn’t configured yet. Please contact the Yene Menu team." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/confirm` },
    });
    if (error) {
      return { error: "We couldn’t request a new email right now. If you requested one recently, wait a minute and try again." };
    }
    return { success: "If an unconfirmed account exists for this email, a fresh confirmation message has been requested. Check your inbox and spam folder." };
  } catch {
    return { error: "We couldn’t request a new email right now. Please try again later." };
  }
}
