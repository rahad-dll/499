import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleDestination } from "./destination.ts";

describe("roleDestination", () => {
  it("routes operational web roles to their portals", () => {
    assert.equal(roleDestination("owner", "login"), "/owner");
    assert.equal(
      roleDestination("authority", "signup"),
      "/command-center",
    );
  });

  it("preserves the driver handoff source", () => {
    assert.equal(
      roleDestination("driver", "login"),
      "/driver-app?source=login",
    );
    assert.equal(
      roleDestination("driver", "signup"),
      "/driver-app?source=signup",
    );
  });

  it("returns a source-free driver destination for session dispatch", () => {
    assert.equal(roleDestination("driver"), "/driver-app");
  });
});
