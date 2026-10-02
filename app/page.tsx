import HomeView from "./home-view";
import { restaurants as previewRestaurants } from "@/lib/restaurants";
import type { MenuContent } from "@/lib/menu-types";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let liveListings: {
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
  }[] = [];

  try {
    const supabase = await createClient();
    const { data: approved } = await supabase.from("restaurants")
      .select("id, slug, name, category, neighborhood")
      .eq("status", "approved")
      .order("name");
    if (approved?.length) {
      const { data: versions } = await supabase.from("menu_versions")
        .select("restaurant_id, content, confirmed_at")
        .in("restaurant_id", approved.map((restaurant) => restaurant.id))
        .eq("status", "published");
      const menusByRestaurant = new Map((versions ?? []).map((version) => [version.restaurant_id, version]));
      liveListings = approved.flatMap((restaurant) => {
        const published = menusByRestaurant.get(restaurant.id);
        if (!published) return [];
        const candidateSections = (published.content as MenuContent | null)?.sections;
        const sections = Array.isArray(candidateSections) ? candidateSections : [];
        const menuCount = sections.reduce((count, section) => count + (Array.isArray(section.items) ? section.items.length : 0), 0);
        const checkedDate = published.confirmed_at
          ? new Date(published.confirmed_at).toLocaleDateString("en-ET", { timeZone: "Africa/Addis_Ababa", day: "numeric", month: "short" })
          : "recently";
        return [{
          slug: restaurant.slug,
          name: restaurant.name,
          category: restaurant.category,
          area: restaurant.neighborhood,
          image: null,
          imageAlt: `${restaurant.name} in ${restaurant.neighborhood}`,
          rating: null,
          priceLevel: null,
          menuCount,
          updated: checkedDate,
        }];
      });
    }
  } catch { /* Sample discovery remains available until the database is configured. */ }

  const isPreview = liveListings.length === 0;
  const listings = isPreview ? previewRestaurants.map((restaurant) => ({
    slug: restaurant.slug,
    name: restaurant.name,
    category: restaurant.category,
    area: restaurant.area,
    image: restaurant.image,
    imageAlt: restaurant.imageAlt,
    rating: restaurant.rating,
    priceLevel: restaurant.priceLevel,
    menuCount: restaurant.menu.reduce((count, section) => count + section.items.length, 0),
    updated: restaurant.updated,
  })) : liveListings;

  return <HomeView restaurants={listings} isPreview={isPreview} />;
}
