import type { Quote } from "@/app/lib/types";

export const runtime = "nodejs";

type ReviewsBody = { appId?: string; country?: string };

type RssEntry = {
  "im:rating"?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
};
type RssFeed = { feed?: { entry?: RssEntry[] } };

const PAGES = 5;
const MAX_REVIEWS = 60;

function feedUrl(country: string, appId: string, page: number) {
  return `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
}

export async function POST(request: Request) {
  let body: ReviewsBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appId = (body.appId ?? "").trim();
  if (!/^\d+$/.test(appId)) {
    return Response.json({ error: "Invalid app id." }, { status: 400 });
  }
  const country = /^[a-zA-Z]{2}$/.test(body.country ?? "")
    ? (body.country as string).toLowerCase()
    : "us";

  // Pull the first few pages in parallel; tolerate individual page failures.
  const pages = await Promise.allSettled(
    Array.from({ length: PAGES }, (_, i) =>
      fetch(feedUrl(country, appId, i + 1), {
        headers: { "User-Agent": "Verbatim/1.0" },
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RssFeed>;
      })
    )
  );

  const fulfilled = pages.filter(
    (p): p is PromiseFulfilledResult<RssFeed> => p.status === "fulfilled"
  );

  // If every page failed, the feed is likely rate-limited or the app is bad.
  if (fulfilled.length === 0) {
    return Response.json(
      { error: "Couldn't fetch reviews (the App Store may be rate-limiting). Try again in a moment, or paste reviews." },
      { status: 502 }
    );
  }

  const seen = new Set<string>();
  const texts: string[] = [];
  for (const page of fulfilled) {
    const entries = page.value.feed?.entry ?? [];
    for (const e of entries) {
      // App-info entries have no rating; real reviews do.
      if (!e["im:rating"]) continue;
      const text = (e.content?.label ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      texts.push(text);
      if (texts.length >= MAX_REVIEWS) break;
    }
    if (texts.length >= MAX_REVIEWS) break;
  }

  if (texts.length === 0) {
    return Response.json(
      { error: "No reviews found for that app. Try another, or paste your own." },
      { status: 404 }
    );
  }

  const quotes: Quote[] = texts.map((text, i) => ({ id: `q${i + 1}`, text }));
  return Response.json({ quotes });
}
