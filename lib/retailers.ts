// UK grocery retailers. None expose a public "add to basket" API to third
// parties, so we deep-link each item into the retailer's own grocery SEARCH —
// one tap to find and add it. Patterns verified against each live site.

export type RetailerId =
  | "tesco"
  | "sainsburys"
  | "morrisons"
  | "waitrose"
  | "asda";

export type Retailer = {
  id: RetailerId;
  name: string;
  /** Build a grocery search URL for a single item. */
  search: (query: string) => string;
};

export const RETAILERS: Retailer[] = [
  {
    id: "tesco",
    name: "Tesco",
    search: (q) =>
      `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}`,
  },
  {
    id: "sainsburys",
    name: "Sainsbury's",
    search: (q) =>
      `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}`,
  },
  {
    id: "morrisons",
    name: "Morrisons",
    search: (q) =>
      `https://groceries.morrisons.com/search?entry=${encodeURIComponent(q)}`,
  },
  {
    id: "waitrose",
    name: "Waitrose",
    search: (q) =>
      `https://www.waitrose.com/ecom/shop/search?searchTerm=${encodeURIComponent(q)}`,
  },
  {
    id: "asda",
    name: "Asda",
    search: (q) =>
      `https://groceries.asda.com/search/${encodeURIComponent(q)}`,
  },
];

export function getRetailer(id: string): Retailer {
  return RETAILERS.find((r) => r.id === id) ?? RETAILERS[0];
}
