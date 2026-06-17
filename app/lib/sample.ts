// ~40 real-feeling, mixed-sentiment reviews for a notes/productivity app.
// Hardcoded so "Load sample" works with zero typing (CLAUDE.md §6).
export const SAMPLE_REVIEWS: string[] = [
  "The offline mode is the only reason I still use it — works perfectly on flights.",
  "Sync broke twice this month and I lost a whole note. Terrifying.",
  "Honestly the cleanest UI of any notes app I've tried.",
  "Way too expensive after the price hike. $12/mo for a notes app is a joke.",
  "I wish it had a proper Kanban board. I keep using Trello alongside it.",
  "Search is instant even with 5000+ notes. Love it.",
  "Customer support ghosted me for three weeks on a billing issue.",
  "Switched from Notion and never looked back — so much faster.",
  "The mobile app crashes every single time I paste an image.",
  "Templates saved me hours. The meeting-notes one is great.",
  "No end-to-end encryption is a dealbreaker. Moving to Obsidian.",
  "Dark mode is gorgeous and easy on the eyes at night.",
  "Collaboration is clunky — comments don't sync in real time.",
  "I'd pay double if they added voice notes with transcription.",
  "The web clipper is the best I've used, period.",
  "Export to PDF mangles all my formatting.",
  "Been a daily user for two years. It just works.",
  "A competitor just shipped AI summaries for half the price.",
  "Onboarding was confusing — I couldn't find how to make a folder for ten minutes.",
  "The keyboard shortcuts are a power user's dream.",
  "It drained my phone battery noticeably in the background.",
  "Tagging keeps my research organized better than anything else.",
  "They removed a feature I relied on in the last update without warning.",
  "Reminders never fire on time, so I stopped trusting them.",
  "The free tier is generous enough that I recommend it to students.",
  "Markdown support is half-baked — tables look broken.",
  "Loading a long note takes forever on my older laptop.",
  "Their changelog shows they actually listen to feedback.",
  "I got locked out for a day because two-factor kept failing.",
  "The handwriting feature on tablet is shockingly good.",
  "Pricing tiers are confusing; I can't tell what I'm actually paying for.",
  "Cross-device sync between my Mac and Android is seamless.",
  "Too many notifications nudging me to upgrade. Feels naggy.",
  "The API let me wire it into my own dashboard — huge for me.",
  "Images blow up the file size and eat my storage quota fast.",
  "Customer support fixed my export bug within an hour. Impressed.",
  "It's gotten slower with every release for the past year.",
  "The daily journal template genuinely improved my routine.",
  "I wish I could password-protect individual notes, not just the app.",
  "Cancelled my subscription after the third sync failure.",
];

import type { Quote } from "./types";

export function sampleQuotes(): Quote[] {
  return SAMPLE_REVIEWS.map((text, i) => ({ id: `q${i + 1}`, text }));
}
