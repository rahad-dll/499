/**
 * Where the CityPulse driver app (Android APK) is published.
 *
 * The newest build is kept as the only file in this GitHub folder. The
 * "Download APK" button (GET /download/apk) always serves whichever .apk is
 * there, so publishing a new build needs no website change — even if its file
 * name changes. No imports, so Node's test runner can load this file directly.
 */
export const APK_SOURCE = {
  owner: "rahad-dll",
  repo: "499",
  branch: "feature/mobile",
  folder: "applications/mobile/Latest App APK",
} as const;

/** GitHub REST API: list the folder's files on that branch. */
export const APK_FOLDER_API_URL =
  `https://api.github.com/repos/${APK_SOURCE.owner}/${APK_SOURCE.repo}/contents/` +
  `${APK_SOURCE.folder.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(APK_SOURCE.branch)}`;

/** GitHub REST API: the newest commit on that branch that touched this APK. */
export function apkCommitsApiUrl(fileName: string): string {
  const path = `${APK_SOURCE.folder}/${fileName}`;
  return (
    `https://api.github.com/repos/${APK_SOURCE.owner}/${APK_SOURCE.repo}/commits` +
    `?sha=${encodeURIComponent(APK_SOURCE.branch)}&path=${encodeURIComponent(path)}&per_page=1`
  );
}

/** When the APK was last pushed (ISO 8601), from a commits listing; null if unknown. */
export function pickCommitDate(listing: unknown): string | null {
  if (!Array.isArray(listing) || listing.length === 0) return null;
  const commit = (listing[0] as { commit?: { committer?: { date?: unknown }; author?: { date?: unknown } } })?.commit;
  const date = commit?.committer?.date ?? commit?.author?.date;
  if (typeof date !== "string" || Number.isNaN(Date.parse(date))) return null;
  return date;
}

/** "10-11-26" (DD-MM-YY), in Dhaka time so every visitor and the server agree. */
export function formatApkDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Asia/Dhaka",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")}-${part("month")}-${part("year")}`;
}

/*
 * Fallbacks that don't use GitHub's REST API, which allows only 60 lookups an
 * hour per IP without a token (a shared server IP can use that up quickly).
 */
const encodedFolder = APK_SOURCE.folder.split("/").map(encodeURIComponent).join("/");

/** github.com folder page; asked with Accept: application/json it returns the file list. */
export const APK_FOLDER_PAGE_URL =
  `https://github.com/${APK_SOURCE.owner}/${APK_SOURCE.repo}/tree/${APK_SOURCE.branch}/${encodedFolder}`;

/** Atom feed of the commits that touched the folder, newest first. */
export const APK_FOLDER_FEED_URL =
  `https://github.com/${APK_SOURCE.owner}/${APK_SOURCE.repo}/commits/${APK_SOURCE.branch}/${encodedFolder}.atom`;

/** raw.githubusercontent.com URL of a file in the folder (served as a binary download). */
export function rawApkUrl(fileName: string): string {
  return (
    `https://raw.githubusercontent.com/${APK_SOURCE.owner}/${APK_SOURCE.repo}/${APK_SOURCE.branch}/` +
    `${encodedFolder}/${encodeURIComponent(fileName)}`
  );
}

/** The .apk name to offer from the folder page's JSON (same choice rule as pickApk). */
export function pickApkNameFromTree(page: unknown): string | null {
  const items = (page as { payload?: { tree?: { items?: unknown } } })?.payload?.tree?.items;
  if (!Array.isArray(items)) return null;
  const names = (items as { name?: unknown; contentType?: unknown }[])
    .filter((item) => item?.contentType === "file" && typeof item.name === "string" && /\.apk$/i.test(item.name))
    .map((item) => item.name as string)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return names[0] ?? null;
}

/** The newest commit date (ISO 8601) in the folder's Atom feed; null if none. */
export function pickFeedDate(xml: string): string | null {
  const date = /<entry>[\s\S]*?<updated>([^<]+)<\/updated>/.exec(xml)?.[1]?.trim();
  return date && !Number.isNaN(Date.parse(date)) ? date : null;
}

export interface ApkFile {
  name: string;
  /** bytes */
  size: number;
  /** raw.githubusercontent.com URL; GitHub serves it as a binary download */
  url: string;
}

interface GitHubEntry {
  type?: unknown;
  name?: unknown;
  size?: unknown;
  download_url?: unknown;
}

/**
 * The APK to offer from a GitHub folder listing: the only .apk there, or — if
 * more than one was left behind — the one whose name sorts last, so
 * "citypulse-1.10.apk" wins over "citypulse-1.9.apk".
 */
export function pickApk(listing: unknown): ApkFile | null {
  if (!Array.isArray(listing)) return null;
  const apks = (listing as GitHubEntry[])
    .filter(
      (entry) =>
        entry?.type === "file" &&
        typeof entry.name === "string" &&
        /\.apk$/i.test(entry.name) &&
        typeof entry.download_url === "string" &&
        entry.download_url.startsWith("https://"),
    )
    .map((entry) => ({
      name: entry.name as string,
      size: typeof entry.size === "number" ? entry.size : 0,
      url: entry.download_url as string,
    }))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  return apks[0] ?? null;
}
