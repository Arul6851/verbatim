import type { AppMatch } from "@/app/lib/types";

export const runtime = "nodejs";

type SearchBody = { query?: string };

type ItunesResult = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

// Server-side only — calling iTunes from the browser would hit CORS.
export async function POST(request: Request) {
  let body: SearchBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return Response.json({ error: "Type an app name to search." }, { status: 400 });
  }

  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: query,
      entity: "software",
      limit: "8",
    }).toString();

  let json: { results?: ItunesResult[] };
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Verbatim/1.0" } });
    if (!res.ok) throw new Error(`iTunes search HTTP ${res.status}`);
    json = await res.json();
  } catch (err) {
    console.error("appstore search error:", err);
    return Response.json(
      { error: "Couldn't reach the App Store. Try again." },
      { status: 502 }
    );
  }

  const apps: AppMatch[] = (json.results ?? [])
    .filter((r) => r.trackId && r.trackName)
    .slice(0, 5)
    .map((r) => ({
      appId: String(r.trackId),
      name: r.trackName as string,
      developer: r.artistName ?? "Unknown developer",
      iconUrl: r.artworkUrl100 ?? r.artworkUrl60 ?? "",
    }));

  if (apps.length === 0) {
    return Response.json(
      { error: `No apps found for “${query}”. Try a different name.` },
      { status: 404 }
    );
  }

  return Response.json({ apps });
}
