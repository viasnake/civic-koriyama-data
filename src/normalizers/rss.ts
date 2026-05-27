import { listRssCategories } from "../db/catalog";

export function classifyRssEntry(title: string, sourceCategories: string[] = []): { category: string | null; tags: string[] } {
  const categories = listRssCategories();
  const matchedTags: string[] = [];
  const text = [title, ...sourceCategories].join(" ");

  for (const category of categories) {
    const matches = category.keywords.filter((keyword) => text.includes(keyword));
    if (matches.length > 0) {
      matchedTags.push(...matches);
      return { category: category.id, tags: unique([...matchedTags, ...sourceCategories]) };
    }
  }

  return { category: null, tags: unique(sourceCategories) };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim() !== ""))];
}
