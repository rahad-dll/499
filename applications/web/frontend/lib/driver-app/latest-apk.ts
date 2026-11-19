import {
  APK_FOLDER_API_URL,
  APK_FOLDER_FEED_URL,
  APK_FOLDER_PAGE_URL,
  apkCommitsApiUrl,
  pickApk,
  pickApkNameFromTree,
  pickCommitDate,
  pickFeedDate,
  rawApkUrl,
  type ApkFile,
} from "./apk";

/** How long an answer is reused; a new build is served within this time. */
const TTL_MS = 5 * 60 * 1000;
const TTL_SECONDS = TTL_MS / 1000;

export interface LatestApk extends ApkFile {
  /** when the developers last pushed the APK (ISO 8601), or null if GitHub didn't say */
  updatedAt: string | null;
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers, next: { revalidate: TTL_SECONDS } });
  return response.ok ? response.json() : null;
}

/** GitHub REST API: exact file list, size and commit date. Rate limited without a token. */
async function fromApi(): Promise<LatestApk | null> {
  const apk = pickApk(await getJson(APK_FOLDER_API_URL, apiHeaders()));
  if (!apk) return null;
  const updatedAt = await getJson(apkCommitsApiUrl(apk.name), apiHeaders())
    .then(pickCommitDate)
    .catch(() => null);
  return { ...apk, updatedAt: updatedAt ?? (await fromFeed()) };
}

async function fromFeed(): Promise<string | null> {
  try {
    const response = await fetch(APK_FOLDER_FEED_URL, { next: { revalidate: TTL_SECONDS } });
    return response.ok ? pickFeedDate(await response.text()) : null;
  } catch {
    return null;
  }
}

/** The file's size from a HEAD request on its raw URL (0 if GitHub didn't say). */
async function rawSize(url: string): Promise<number | null> {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!response.ok) return null;
  return Number(response.headers.get("content-length")) || 0;
}

/** github.com pages (not the REST API): folder listing, raw file size and commits feed. */
async function fromWebsite(knownName: string | undefined): Promise<LatestApk | null> {
  const name =
    pickApkNameFromTree(await getJson(APK_FOLDER_PAGE_URL, { Accept: "application/json" }).catch(() => null)) ??
    knownName ??
    // the build's usual name, in case the folder page couldn't be read
    "CityPulse.apk";
  const url = rawApkUrl(name);
  const [size, updatedAt] = await Promise.all([rawSize(url), fromFeed()]);
  if (size === null) return null; // the file isn't there
  return { name, size, url, updatedAt };
}

let cached: { apk: LatestApk; at: number } | undefined;

/**
 * The newest driver APK in the GitHub folder with its size and last update
 * date, or null when GitHub can't be reached at all. Server-only.
 *
 * Tries the REST API first, then github.com's own pages, which have no
 * 60-an-hour limit. A good answer is kept for 5 minutes, and the last good
 * answer is reused if GitHub is briefly unreachable.
 */
export async function findLatestApk(): Promise<LatestApk | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.apk;
  let apk: LatestApk | null = null;
  try {
    apk = await fromApi();
  } catch {
    apk = null;
  }
  if (!apk) {
    try {
      apk = await fromWebsite(cached?.apk.name);
    } catch {
      apk = null;
    }
  }
  if (apk) cached = { apk, at: Date.now() };
  return apk ?? cached?.apk ?? null;
}
