import HomeView from "./home-view";
import { restaurants as previewRestaurants } from "@/lib/restaurants";
import type { MenuContent } from "@/lib/menu-types";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  let viewerName: string | null = null;
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
    menuPublished: boolean;
    updated: string;
  }[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const fullName = user.user_metadata?.full_name;
      viewerName =
        typeof fullName === "string" && fullName.trim()
          ? fullName.trim().split(/\s+/)[0]
          : (user.email?.split("@")[0] ?? "there");
    }
    const { data: approved } = await supabase
      .from("restaurants")
      .select("id, slug, name, category, neighborhood, cover_image_path")
      .eq("status", "approved")
      .order("name");
    if (approved?.length) {
      const imageUrls = new Map(
        await Promise.all(
          approved
            .filter((restaurant) => restaurant.cover_image_path)
            .map(async (restaurant) => {
              const { data } = await supabase.storage
                .from("restaurant-images")
                .createSignedUrl(
                  restaurant.cover_image_path as string,
                  60 * 60,
                );
              return [restaurant.id, data?.signedUrl ?? null] as const;
            }),
        ),
      );
      const { data: versions } = await supabase
        .from("menu_versions")
        .select("restaurant_id, content, confirmed_at")
        .in(
          "restaurant_id",
          approved.map((restaurant) => restaurant.id),
        )
        .eq("status", "published");
      const menusByRestaurant = new Map(
        (versions ?? []).map((version) => [version.restaurant_id, version]),
      );
      liveListings = approved.map((restaurant) => {
        const published = menusByRestaurant.get(restaurant.id);
        const candidateSections = (published?.content as MenuContent | null)
          ?.sections;
        const sections = Array.isArray(candidateSections)
          ? candidateSections
          : [];
        const menuCount = sections.reduce(
          (count, section) =>
            count + (Array.isArray(section.items) ? section.items.length : 0),
          0,
        );
        const checkedDate = published?.confirmed_at
          ? new Date(published.confirmed_at).toLocaleDateString("en-ET", {
              timeZone: "Africa/Addis_Ababa",
              day: "numeric",
              month: "short",
            })
          : "menu coming soon";
        return {
          slug: restaurant.slug,
          name: restaurant.name,
          category: restaurant.category,
          area: restaurant.neighborhood,
          image: imageUrls.get(restaurant.id) ?? null,
          imageAlt: `${restaurant.name} in ${restaurant.neighborhood}`,
          rating: null,
          priceLevel: null,
          menuCount,
          menuPublished: Boolean(published),
          updated: checkedDate,
        };
      });
    }
  } catch {
    /* Sample discovery remains available until the database is configured. */
  }

  // Vercel preview builds use NODE_ENV=production too, so keep previews distinct from the live domain.
  const mayShowSamples =
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview";
  const isPreview = liveListings.length === 0 && mayShowSamples;
  const listings =
    liveListings.length > 0
      ? liveListings
      : isPreview
        ? previewRestaurants.map((restaurant) => ({
            slug: restaurant.slug,
            name: restaurant.name,
            category: restaurant.category,
            area: restaurant.area,
            image: restaurant.image,
            imageAlt: restaurant.imageAlt,
            rating: restaurant.rating,
            priceLevel: restaurant.priceLevel,
            menuCount: restaurant.menu.length,
            menuPublished: true,
            updated: restaurant.updated,
          }))
        : [];

  return (
    <HomeView
      restaurants={listings}
      isPreview={isPreview}
      viewerName={viewerName}
    />
  );
}
