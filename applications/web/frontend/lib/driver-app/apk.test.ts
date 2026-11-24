import assert from "node:assert/strict";
import { test } from "node:test";
import {
  APK_FOLDER_API_URL,
  APK_FOLDER_FEED_URL,
  APK_FOLDER_PAGE_URL,
  apkCommitsApiUrl,
  formatApkDate,
  pickApk,
  pickApkNameFromTree,
  pickCommitDate,
  pickFeedDate,
  rawApkUrl,
} from "./apk.ts";

const RAW = "https://raw.githubusercontent.com/rahad-dll/499/feature/mobile/applications/mobile/Latest%20App%20APK/";

const file = (name: string, size = 1000) => ({ type: "file", name, size, download_url: `${RAW}${encodeURIComponent(name)}` });

test("lists the APK folder on the feature/mobile branch", () => {
  assert.equal(
    APK_FOLDER_API_URL,
    "https://api.github.com/repos/rahad-dll/499/contents/applications/mobile/Latest%20App%20APK?ref=feature%2Fmobile",
  );
});

test("picks the only APK, whatever it is called", () => {
  assert.deepEqual(pickApk([file("base.apk", 95_204_009)]), {
    name: "base.apk",
    size: 95_204_009,
    url: `${RAW}base.apk`,
  });
  assert.equal(pickApk([file("CityPulse-Driver.APK")])?.name, "CityPulse-Driver.APK");
});

test("ignores other files and folders", () => {
  const listing = [file("README.md"), { type: "dir", name: "old.apk", download_url: null }, file("app.apk")];
  assert.equal(pickApk(listing)?.name, "app.apk");
});

test("prefers the highest version when several APKs are left in the folder", () => {
  assert.equal(pickApk([file("citypulse-1.9.apk"), file("citypulse-1.10.apk")])?.name, "citypulse-1.10.apk");
});

test("returns null when there is nothing to download", () => {
  assert.equal(pickApk([]), null);
  assert.equal(pickApk([file("notes.txt")]), null);
  assert.equal(pickApk({ message: "API rate limit exceeded" }), null);
  assert.equal(pickApk([{ type: "file", name: "x.apk", download_url: "http://insecure/x.apk" }]), null);
});

test("asks for the newest commit that touched the APK", () => {
  assert.equal(
    apkCommitsApiUrl("CityPulse.apk"),
    "https://api.github.com/repos/rahad-dll/499/commits?sha=feature%2Fmobile&path=applications%2Fmobile%2FLatest%20App%20APK%2FCityPulse.apk&per_page=1",
  );
});

test("reads the update date from a commits listing", () => {
  assert.equal(pickCommitDate([{ commit: { committer: { date: "2026-11-10T08:00:00Z" } } }]), "2026-11-10T08:00:00Z");
  assert.equal(pickCommitDate([{ commit: { author: { date: "2026-11-09T08:00:00Z" } } }]), "2026-11-09T08:00:00Z");
  assert.equal(pickCommitDate([]), null);
  assert.equal(pickCommitDate({ message: "API rate limit exceeded" }), null);
  assert.equal(pickCommitDate([{ commit: { committer: { date: "soon" } } }]), null);
});

test("shows the update date as DD-MM-YY in Dhaka time", () => {
  assert.equal(formatApkDate("2026-11-10T08:00:00Z"), "10-11-26");
  assert.equal(formatApkDate("2026-03-05T08:00:00Z"), "05-03-26");
  // 9 Nov 20:30 UTC is already 10 Nov in Dhaka
  assert.equal(formatApkDate("2026-11-09T20:30:00Z"), "10-11-26");
});

test("builds the non-API GitHub URLs", () => {
  assert.equal(
    APK_FOLDER_PAGE_URL,
    "https://github.com/rahad-dll/499/tree/feature/mobile/applications/mobile/Latest%20App%20APK",
  );
  assert.equal(APK_FOLDER_FEED_URL, `${APK_FOLDER_PAGE_URL.replace("/tree/", "/commits/")}.atom`);
  assert.equal(rawApkUrl("CityPulse.apk"), `${RAW}CityPulse.apk`);
});

test("reads the APK name from the github.com folder page", () => {
  const page = (items: unknown[]) => ({ payload: { tree: { items } } });
  assert.equal(pickApkNameFromTree(page([{ name: "CityPulse.apk", contentType: "file" }])), "CityPulse.apk");
  assert.equal(
    pickApkNameFromTree(page([{ name: "a-1.9.apk", contentType: "file" }, { name: "a-1.10.apk", contentType: "file" }, { name: "x.apk", contentType: "directory" }])),
    "a-1.10.apk",
  );
  assert.equal(pickApkNameFromTree(page([{ name: "README.md", contentType: "file" }])), null);
  assert.equal(pickApkNameFromTree(null), null);
});

test("reads the newest commit date from the folder's Atom feed", () => {
  const xml = "<feed><updated>2026-11-04T00:00:00Z</updated><entry><updated>2026-11-03T05:12:13Z</updated></entry><entry><updated>2026-10-01T00:00:00Z</updated></entry></feed>";
  assert.equal(pickFeedDate(xml), "2026-11-03T05:12:13Z");
  assert.equal(pickFeedDate("<feed></feed>"), null);
});
