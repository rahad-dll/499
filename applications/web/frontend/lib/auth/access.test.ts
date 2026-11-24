import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessRedirect,
  parseRole,
  postLoginDestination,
  requiredRole,
} from "./access.ts";

describe("parseRole", () => {
  it("accepts known roles only", () => {
    assert.equal(parseRole("admin"), "admin");
    assert.equal(parseRole("owner"), "owner");
    assert.equal(parseRole("superuser"), null);
    assert.equal(parseRole(""), null);
    assert.equal(parseRole(undefined), null);
  });
});

describe("requiredRole", () => {
  it("maps each portal to its role", () => {
    assert.equal(requiredRole("/admin"), "admin");
    assert.equal(requiredRole("/admin/users"), "admin");
    assert.equal(requiredRole("/owner/spaces/new"), "owner");
    assert.equal(requiredRole("/command-center"), "authority");
  });

  it("leaves public pages and look-alike paths open", () => {
    assert.equal(requiredRole("/"), null);
    assert.equal(requiredRole("/login"), null);
    assert.equal(requiredRole("/administrator"), null);
    assert.equal(requiredRole("/owners"), null);
  });
});

describe("accessRedirect", () => {
  it("sends signed-out visitors to login and remembers the page", () => {
    assert.equal(accessRedirect("/admin", null), "/login?next=%2Fadmin");
    assert.equal(
      accessRedirect("/owner/revenue", null),
      "/login?next=%2Fowner%2Frevenue",
    );
  });

  it("lets the matching role through", () => {
    assert.equal(accessRedirect("/admin", "admin"), null);
    assert.equal(accessRedirect("/owner/cameras", "owner"), null);
    assert.equal(accessRedirect("/command-center/zones", "authority"), null);
  });

  it("sends the wrong role to its own home", () => {
    assert.equal(accessRedirect("/admin", "owner"), "/owner");
    assert.equal(accessRedirect("/admin", "driver"), "/driver-app");
    assert.equal(accessRedirect("/owner", "admin"), "/admin");
    assert.equal(accessRedirect("/command-center", "owner"), "/owner");
  });

  it("keeps signed-in users off login and signup", () => {
    assert.equal(accessRedirect("/login", "admin"), "/admin");
    assert.equal(accessRedirect("/signup", "authority"), "/command-center");
    assert.equal(accessRedirect("/login", null), null);
    assert.equal(accessRedirect("/signup", null), null);
  });

  it("ignores public pages", () => {
    assert.equal(accessRedirect("/", "admin"), null);
    assert.equal(accessRedirect("/research", null), null);
  });
});

describe("postLoginDestination", () => {
  it("returns to the page that asked for sign-in", () => {
    assert.equal(postLoginDestination("/admin", "admin"), "/admin");
    assert.equal(postLoginDestination("/owner/revenue?range=7d", "owner"), "/owner/revenue?range=7d");
  });

  it("falls back to the role home for pages the role cannot open", () => {
    assert.equal(postLoginDestination("/admin", "owner"), "/owner");
    assert.equal(postLoginDestination("/research", "admin"), "/admin");
    assert.equal(postLoginDestination(null, "driver"), "/driver-app?source=login");
  });

  it("never leaves the site", () => {
    assert.equal(postLoginDestination("https://evil.example/admin", "admin"), "/admin");
    assert.equal(postLoginDestination("//evil.example/admin", "admin"), "/admin");
    assert.equal(postLoginDestination("/\\evil.example", "admin"), "/admin");
  });
});
