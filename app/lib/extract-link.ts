import LinkifyIt from "linkify-it";

const linkify = new LinkifyIt();

export function getFirstLink(text: string): string | null {
  const [match] = linkify.match(text) ?? [];

  if (!match) {
    return null;
  }

  try {
    return new URL(match.url).toString();
  } catch {
    return null;
  }
}
