import { listRssCategories } from "../db/catalog";

export function classifyRssEntry(title: string): { category: string | null; tags: string[] } {
  const categories = listRssCategories();
  const matchedTags: string[] = [];

  for (const category of categories) {
    const matches = category.keywords.filter((keyword) => title.includes(keyword));
    if (matches.length > 0) {
      matchedTags.push(...matches);
      return { category: category.id, tags: [...new Set(matchedTags)] };
    }
  }

  return { category: null, tags: [] };
}
