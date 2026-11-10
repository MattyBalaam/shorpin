// The demo data both seeds use: the mock's (seed.ts) and a preview's test
// project users (the preview user module). One source, so a preview on the
// real test project looks like one on the mock.

export interface SeedList {
  name: string;
  slug: string;
  items: string[];
}

/**
 * Owner gets 2 lists: one long enough to scroll (30 items), one empty. Some
 * items carry a trailing `[tag]` (see item-tag.ts); Milk, Bread and Eggs stay
 * untagged as the tests' everyday fixtures. The first list is shared with the
 * collaborator.
 */
export const ownerLists: SeedList[] = [
  {
    name: "Shopping",
    slug: "shopping",
    items: [
      "Milk",
      "Bread",
      "Eggs",
      "Butter",
      "Cheese [dairy]",
      "Bananas [fruit]",
      "Apples [fruit]",
      "Yogurt [dairy]",
      "Orange juice",
      "Coffee",
      "Tea",
      "Sugar",
      "Rice",
      "Pasta",
      "Tomatoes [veg]",
      "Onions [veg]",
      "Garlic",
      "Potatoes",
      "Carrots [veg]",
      "Chicken [meat]",
      "Olive oil",
      "Flour",
      "Cereal",
      "Peanut butter",
      "Honey",
      "Lettuce",
      "Cucumber",
      "Peppers",
      "Washing-up liquid [household]",
      "Toilet roll [household]",
    ],
  },
  { name: "Owner Empty", slug: "owner-empty", items: [] },
];

/** Collab gets 2 lists: one with 6 items, one empty. */
export const collabLists: SeedList[] = [
  {
    name: "Collab Shopping",
    slug: "collab-shopping",
    items: ["Coffee", "Tea", "Sugar", "Cream [dairy]", "Honey", "Jam [spreads]"],
  },
  { name: "Collab Empty", slug: "collab-empty", items: [] },
];
