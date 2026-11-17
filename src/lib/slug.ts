/** URL slug for an operator name: "Charge & Go" -> "charge-and-go". Shared by the server pages and the client links. */
export const opSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const opHref = (name: string) => `/operators/${opSlug(name)}`;
