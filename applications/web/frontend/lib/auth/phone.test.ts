import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "./phone.ts";

describe("Bangladeshi phone numbers", () => {
  it("accepts every currently valid local operator prefix", () => {
    for (const prefix of ["013", "014", "015", "016", "017", "018", "019"]) {
      assert.equal(isValidBangladeshPhone(`${prefix}12345678`), true);
    }
  });

  it("rejects unassigned and malformed local numbers", () => {
    assert.equal(isValidBangladeshPhone("01204423652"), false);
    assert.equal(isValidBangladeshPhone("0171234567"), false);
    assert.equal(isValidBangladeshPhone("02012345678"), false);
  });

  it("normalizes international and formatted input for the API", () => {
    assert.equal(normalizeBangladeshPhone("+880 1712-345678"), "01712345678");
    assert.equal(normalizeBangladeshPhone("8801712345678"), "01712345678");
    assert.equal(normalizeBangladeshPhone("01712 345 678"), "01712345678");
  });
});
