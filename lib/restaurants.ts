export type MenuItem = {
  name: string;
  description: string;
  price: number;
  tags?: string[];
};

export type MenuSection = {
  name: string;
  items: MenuItem[];
};

export type Restaurant = {
  slug: string;
  name: string;
  category: string;
  area: string;
  description: string;
  image: string;
  imageAlt: string;
  accent: string;
  rating: string;
  priceLevel: string;
  updated: string;
  hours: string;
  phone: string;
  menu: MenuSection[];
};

export const restaurants: Restaurant[] = [
  {
    slug: "mekdes-kitchen",
    name: "Mekdes Kitchen",
    category: "Ethiopian",
    area: "Bole",
    description: "Slow-cooked classics, fresh injera, and generous plates made for sharing.",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "A colourful spread of freshly prepared food",
    accent: "#d27b4b",
    rating: "4.8",
    priceLevel: "$$",
    updated: "Today",
    hours: "Open today · 10:00 AM – 10:00 PM",
    phone: "+251 11 555 0140",
    menu: [
      { name: "Mekdes special tibs", description: "Sautéed beef, rosemary, onion, and a little awaze.", price: 680, tags: ["Popular"] },
      { name: "Vegetarian bayaynetu", description: "A colourful selection of seven fasting favourites on injera.", price: 490, tags: ["Vegetarian", "Vegan"] },
      { name: "Doro wat", description: "Slow-cooked chicken in berbere sauce, finished with a boiled egg.", price: 720 },
      { name: "Fresh injera", description: "Teff injera, served warm.", price: 60, tags: ["Vegan"] },
    ],
  },
  {
    slug: "buna-house",
    name: "Buna House",
    category: "Café & brunch",
    area: "Kazanchis",
    description: "A relaxed neighbourhood café for a proper buna ceremony and an easy brunch.",
    image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Warm, welcoming neighbourhood café interior",
    accent: "#7b8a58",
    rating: "4.7",
    priceLevel: "$$",
    updated: "Yesterday",
    hours: "Open today · 7:30 AM – 8:00 PM",
    phone: "+251 11 555 0182",
    menu: [
      { name: "Traditional buna", description: "Freshly roasted coffee, served with popcorn.", price: 120, tags: ["Popular"] },
      { name: "Chechebsa", description: "Flaky torn flatbread with spiced butter and honey.", price: 280, tags: ["Vegetarian"] },
      { name: "Avocado toast", description: "Sourdough, smashed avocado, lemon, and chilli flakes.", price: 390, tags: ["Vegetarian"] },
      { name: "Macchiato", description: "A double shot with silky steamed milk.", price: 110 },
    ],
  },
  {
    slug: "blue-nile-grill",
    name: "Blue Nile Grill",
    category: "Grill",
    area: "Piazza",
    description: "Fire-grilled favourites, crisp salads, and a laid-back dinner table.",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Freshly grilled dinner served at a restaurant",
    accent: "#c47b43",
    rating: "4.6",
    priceLevel: "$$$",
    updated: "Sep 20",
    hours: "Open today · 12:00 PM – 11:00 PM",
    phone: "+251 11 555 0126",
    menu: [
      { name: "Mixed grill platter", description: "Grilled beef, chicken, and vegetables with two sauces.", price: 1150, tags: ["For sharing"] },
      { name: "Grilled chicken", description: "Herb-marinated chicken with roasted potatoes.", price: 760 },
      { name: "Garden salad", description: "Tomato, cucumber, greens, and house lemon dressing.", price: 320, tags: ["Vegetarian"] },
      { name: "Grilled corn", description: "Charred sweet corn with spiced butter.", price: 180, tags: ["Vegetarian"] },
    ],
  },
  {
    slug: "saba-pasta-room",
    name: "Saba Pasta Room",
    category: "Italian",
    area: "Bole",
    description: "Handmade pasta, slow Sunday sauces, and a little Italian comfort in Addis.",
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "A comforting bowl of pasta with fresh herbs",
    accent: "#bd5940",
    rating: "4.5",
    priceLevel: "$$$",
    updated: "Sep 18",
    hours: "Open today · 11:00 AM – 10:00 PM",
    phone: "+251 11 555 0163",
    menu: [
      { name: "Tagliatelle bolognese", description: "Fresh ribbons with a slow-cooked beef and tomato ragù.", price: 790, tags: ["Popular"] },
      { name: "Penne al forno", description: "Baked penne, tomato, mozzarella, and basil.", price: 710, tags: ["Vegetarian"] },
      { name: "Mushroom risotto", description: "Creamy arborio rice, mushrooms, and parmesan.", price: 740, tags: ["Vegetarian"] },
      { name: "Tiramisu", description: "Espresso-soaked sponge layered with mascarpone.", price: 340 },
    ],
  },
  {
    slug: "the-green-table",
    name: "The Green Table",
    category: "Healthy",
    area: "Old Airport",
    description: "Fresh bowls, bright flavours, and feel-good lunches made to order.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "A fresh salad bowl with colourful vegetables",
    accent: "#78906b",
    rating: "4.9",
    priceLevel: "$$",
    updated: "Today",
    hours: "Open today · 8:00 AM – 8:30 PM",
    phone: "+251 11 555 0194",
    menu: [
      { name: "Addis harvest bowl", description: "Teff, roasted pumpkin, greens, chickpeas, and tahini.", price: 560, tags: ["Vegan", "Popular"] },
      { name: "Chicken protein bowl", description: "Grilled chicken, avocado, grains, and herb yoghurt.", price: 680 },
      { name: "Seasonal fruit cup", description: "A chilled mix of today's fresh fruit.", price: 240, tags: ["Vegan"] },
      { name: "Ginger lemonade", description: "Fresh lemon, ginger, and a touch of honey.", price: 160 },
    ],
  },
  {
    slug: "habesha-table",
    name: "Habesha Table",
    category: "Ethiopian",
    area: "Sarbet",
    description: "A welcoming table for the dishes you grew up with and the friends you bring along.",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85&sat=-20",
    imageAlt: "A generous table of Ethiopian-inspired dishes",
    accent: "#a65037",
    rating: "4.7",
    priceLevel: "$$",
    updated: "Sep 21",
    hours: "Open today · 11:00 AM – 10:00 PM",
    phone: "+251 11 555 0119",
    menu: [
      { name: "Siga tibs", description: "Tender beef sautéed with onion, green pepper, and rosemary.", price: 650 },
      { name: "Shiro tegamino", description: "Silky chickpea stew served bubbling in a clay pot.", price: 390, tags: ["Vegan"] },
      { name: "Gomen besiga", description: "Slow-cooked greens with beef and warming spices.", price: 520 },
      { name: "Firfir", description: "Pieces of injera tossed in a bright, gently spiced sauce.", price: 360, tags: ["Vegan"] },
    ],
  },
];

export const categories = ["All menus", "Ethiopian", "Café & brunch", "Grill", "Italian", "Healthy"];

export function formatBirr(amount: number) {
  return `ETB ${new Intl.NumberFormat("en-ET").format(amount)}`;
}
