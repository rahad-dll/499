import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boxFromPoints,
  buildCreateInput,
  buildCameraInput,
  buildVehicleRates,
  cameraPrefix,
  defaultVehicleRates,
  duplicateLabels,
  moveBox,
  nextSlotLabel,
  overlaps,
  overlapsAny,
  SLOT_LABEL_PATTERN,
  type DraftCamera,
  type LotDetails,
} from "./layout.ts";

const FRAME = { width: 1280, height: 720 };

function camera(overrides: Partial<DraftCamera> = {}): DraftCamera {
  return {
    key: "cam-1",
    label: "Entrance",
    source: "video",
    rtsp_url: "",
    video: null,
    snapshot: null,
    previewUrl: null,
    frame: FRAME,
    slots: [],
    ...overrides,
  };
}

const DETAILS: LotDetails = {
  name: "  Gulshan Zone A ",
  contact_phone: "01712345678",
  address: "House 12, Road 5, Gulshan",
  latitude: 23.79371234,
  longitude: 90.40661234,
  amenities: ["cctv"],
  space_type: "outdoor",
  max_height_cm: "210",
  open24h: true,
  description: "",
};

describe("overlaps", () => {
  const a = { x: 0, y: 0, width: 100, height: 100 };

  it("detects intersecting rectangles", () => {
    assert.equal(overlaps(a, { x: 50, y: 50, width: 100, height: 100 }), true);
    assert.equal(overlaps(a, { x: 10, y: 10, width: 10, height: 10 }), true);
  });

  it("allows rectangles that only share an edge", () => {
    assert.equal(overlaps(a, { x: 100, y: 0, width: 50, height: 50 }), false);
    assert.equal(overlaps(a, { x: 0, y: 100, width: 50, height: 50 }), false);
  });

  it("checks against every other slot", () => {
    const others = [{ x: 300, y: 300, width: 10, height: 10 }, a];
    assert.equal(overlapsAny({ x: 90, y: 90, width: 20, height: 20 }, others), true);
    assert.equal(overlapsAny({ x: 200, y: 0, width: 20, height: 20 }, others), false);
  });
});

describe("boxFromPoints / moveBox", () => {
  it("normalizes a drag in any direction and clips it to the frame", () => {
    assert.deepEqual(boxFromPoints({ x: 300, y: 200 }, { x: 100, y: 50 }, FRAME), {
      x: 100,
      y: 50,
      width: 200,
      height: 150,
    });
    assert.deepEqual(boxFromPoints({ x: -20, y: 700 }, { x: 50, y: 800 }, FRAME), {
      x: 0,
      y: 700,
      width: 50,
      height: 20,
    });
  });

  it("keeps a moved box inside the frame", () => {
    const box = { x: 1200, y: 10, width: 60, height: 40 };
    assert.deepEqual(moveBox(box, 100, -50, FRAME), { x: 1220, y: 0, width: 60, height: 40 });
  });
});

describe("slot labels", () => {
  it("gives each camera a letter prefix", () => {
    assert.equal(cameraPrefix(0), "A");
    assert.equal(cameraPrefix(25), "Z");
    assert.equal(cameraPrefix(26), "AA");
  });

  it("picks the first label free across the lot", () => {
    assert.equal(nextSlotLabel("A", []), "A01");
    assert.equal(nextSlotLabel("A", ["A01", "a02", "B03"]), "A03");
  });

  it("finds duplicates regardless of case and spacing", () => {
    const box = { x: 0, y: 0, width: 10, height: 10 };
    const slot = (label: string) => ({ key: label, label, vehicle_type: "car" as const, rate: "", box });
    const dupes = duplicateLabels([
      camera({ slots: [slot("A01"), slot("A02")] }),
      camera({ key: "cam-2", slots: [slot(" a01 ")] }),
    ]);
    assert.deepEqual([...dupes], ["A01"]);
  });
});

describe("payloads", () => {
  const rates = { ...defaultVehicleRates(), car: "50", motorcycle: "20" };
  const cameras = [
    camera({
      slots: [
        { key: "s1", label: "a01", vehicle_type: "car", rate: "", box: { x: 10, y: 20, width: 100, height: 60 } },
        { key: "s2", label: "A02", vehicle_type: "motorcycle", rate: "15.5", box: { x: 120, y: 20, width: 40, height: 60 } },
      ],
    }),
    camera({ key: "cam-2", label: "Gate", source: "rtsp", rtsp_url: " rtsp://10.0.0.5/s1 ", frame: null }),
  ];

  it("derives capacity and the cheapest rate for POST /spaces", () => {
    const input = buildCreateInput(DETAILS, cameras, rates);
    assert.equal(input.name, "Gulshan Zone A");
    assert.equal(input.total_capacity, 2);
    assert.equal(input.base_rate_unit, 1550);
    assert.equal(input.max_height_cm, 210);
    assert.equal(input.latitude, 23.793712);
    assert.equal(input.description, undefined);
    assert.deepEqual(Object.keys(input.operating_hours ?? {}), ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    assert.equal("rtsp_url" in input, false);
  });

  it("sets one lot rate per vehicle type in use (PUT /spaces/:id/rates/:type)", () => {
    assert.deepEqual(buildVehicleRates(cameras, rates), [
      { vehicle_type: "car", hourly_rate_unit: 5000 },
      { vehicle_type: "motorcycle", hourly_rate_unit: 2000 },
    ]);
  });

  it("builds POST /spaces/:id/cameras with pixel boxes and only typed slot rates", () => {
    const input = buildCameraInput(cameras[0]);
    assert.ok(input);
    assert.equal(input.frame_width, 1280);
    assert.equal(input.frame_height, 720);
    assert.equal(input.rtsp_url, undefined);
    assert.deepEqual(input.slots?.[0], {
      slot_label: "A01",
      vehicle_type: "car",
      bbox: { x: 10, y: 20, width: 100, height: 60 },
    });
    assert.equal(input.slots?.[1].hourly_rate_unit, 1550);
  });

  it("trims the RTSP URL and skips a camera with no frame to mark on", () => {
    assert.equal(buildCameraInput(cameras[1]), null);
    const withFrame = buildCameraInput({ ...cameras[1], frame: { width: 1920.4, height: 1080 } });
    assert.equal(withFrame?.rtsp_url, "rtsp://10.0.0.5/s1");
    assert.equal(withFrame?.frame_width, 1920);
    assert.equal(withFrame?.source_type, "rtsp");
  });

  it("accepts only the slot labels the API accepts", () => {
    assert.ok(SLOT_LABEL_PATTERN.test("A-01"));
    assert.ok(!SLOT_LABEL_PATTERN.test("A 01"));
    assert.ok(!SLOT_LABEL_PATTERN.test("A_01"));
    assert.ok(!SLOT_LABEL_PATTERN.test("x".repeat(21)));
  });
});
