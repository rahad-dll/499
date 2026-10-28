import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProfileShapeError, normalizeProfile } from "./normalize.ts";

const user = {
  id: "u1",
  email: "authority@citypulse.test",
  full_name: "Rahad Hossain",
  phone: "01712345678",
  phone_verified: true,
  avatar_url: null,
  is_active: true,
  last_login_at: "2026-10-04T10:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-02T10:00:00Z",
  area: { id: "a1", name: "Gulshan" },
};

describe("normalizeProfile", () => {
  it("passes through the documented { user, profile } shape", () => {
    const result = normalizeProfile({
      user: { ...user, role: "authority" },
      profile: { type: "authority", organization: "DMP", badge_number: "DMP-001", area: null },
    });
    assert.equal(result.user.full_name, "Rahad Hossain");
    assert.deepEqual(result.profile, { type: "authority", organization: "DMP", badge_number: "DMP-001", area: null });
  });

  it("reads a user row with a role relation and nested role profile", () => {
    const result = normalizeProfile({
      ...user,
      role: { name: "owner" },
      owner_profile: { business_name: "Gulshan Parking Ltd.", address: "Road 5", verified: true, verified_at: null },
    });
    assert.equal(result.user.role, "owner");
    assert.equal(result.user.area?.name, "Gulshan");
    assert.equal(result.profile.type, "owner");
    assert.equal(result.profile.type === "owner" && result.profile.business_name, "Gulshan Parking Ltd.");
  });

  it("reads a role-profile row that embeds its user", () => {
    const result = normalizeProfile(
      { id: "p1", user_id: "u1", organization: "DMP", badge_number: null, user: { ...user } },
      { role: "authority" },
    );
    assert.equal(result.user.email, "authority@citypulse.test");
    assert.equal(result.profile.type === "authority" && result.profile.organization, "DMP");
  });

  it("unwraps a { data } envelope and fills gaps from the session", () => {
    const result = normalizeProfile(
      { data: { email: "x@citypulse.test", role: "driver" } },
      { id: "u9", full_name: "Cached Name" },
    );
    assert.equal(result.user.id, "u9");
    assert.equal(result.user.full_name, "Cached Name");
    assert.equal(result.user.phone, "");
    assert.deepEqual(result.profile, { type: "driver", area: null });
  });

  it("rejects responses without any usable role", () => {
    assert.throws(() => normalizeProfile({ email: "x@y.z" }), ProfileShapeError);
    assert.throws(() => normalizeProfile(null), ProfileShapeError);
  });
});
