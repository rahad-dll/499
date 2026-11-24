#!/usr/bin/env node
/**
 * Adds demo parking lots around BRAC University, East West University,
 * Natun Bazar, Khilkhet and Mohakhali to the CityPulse API, each with one
 * camera and car slots labelled A0–A3, A0–A4 or A0–A5.
 *
 * It sends the same requests as the owner "Register lot" wizard
 * (docs/register-parking-lot-api.md):
 *   POST /spaces → PUT /spaces/:id/rates/car → POST /spaces/:id/cameras
 * New lots are "pending". With --approve it also signs in as an admin and sets
 * them to "active" (PATCH /admin/spaces/:id/status), so drivers, the owner
 * Lot map and the authority command center show them.
 *
 * Safe to re-run: a lot whose name the owner already has is skipped.
 *
 *   node --env-file=.env.local scripts/seed-demo-lots.mjs --dry-run
 *   node --env-file=.env.local scripts/seed-demo-lots.mjs
 *   node --env-file=.env.local scripts/seed-demo-lots.mjs --approve
 *
 * Credentials come from OWNER_EMAIL / OWNER_PASSWORD (and ADMIN_EMAIL /
 * ADMIN_PASSWORD for --approve) or are asked for in the terminal. They are
 * only sent to the API's /auth/login.
 */

import { createInterface } from "node:readline";

const API = (process.env.CITYPULSE_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://four99-b6wg.onrender.com").replace(/\/+$/, "");
const DRY_RUN = process.argv.includes("--dry-run");
const APPROVE = process.argv.includes("--approve");

/* ---------------- the lots ----------------
 * Coordinates are close to each landmark, not surveyed: drag a pin in
 * Owner → Settings → Location to fine-tune it. Rates are taka per hour. */

const ALL_DAY = Object.fromEntries(
  ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, { open: "00:00", close: "23:59" }]),
);

const LOTS = [
  // BRAC University (Merul Badda)
  { name: "BRAC University Gate Parking", area: "Merul Badda", address: "Bir Uttam Rafiqul Islam Ave, near BRAC University, Merul Badda, Dhaka", lat: 23.77335, lng: 90.4252, slots: 6, rate: 40, type: "outdoor", amenities: ["cctv", "security_guard"] },
  { name: "BRAC University East Parking", area: "Merul Badda", address: "Merul Badda, behind BRAC University, Dhaka", lat: 23.7725, lng: 90.4266, slots: 5, rate: 35, type: "outdoor", amenities: ["cctv"] },
  { name: "Merul Badda Link Road Parking", area: "Merul Badda", address: "Link Road, Merul Badda, Dhaka", lat: 23.7754, lng: 90.4264, slots: 4, rate: 30, type: "outdoor", amenities: ["cctv"] },

  // East West University (Aftabnagar)
  { name: "East West University Gate Parking", area: "Aftabnagar", address: "A/2 Jahurul Islam Ave, near East West University, Aftabnagar, Dhaka", lat: 23.7688, lng: 90.4255, slots: 6, rate: 40, type: "outdoor", amenities: ["cctv", "security_guard"] },
  { name: "Aftabnagar Main Road Parking", area: "Aftabnagar", address: "Jahurul Islam Ave, Aftabnagar, Dhaka", lat: 23.7676, lng: 90.4276, slots: 4, rate: 25, type: "outdoor", amenities: ["cctv"] },

  // Natun Bazar
  { name: "Natun Bazar Progati Sarani Parking", area: "Natun Bazar", address: "Progati Sarani, Natun Bazar, Dhaka", lat: 23.7978, lng: 90.4233, slots: 5, rate: 40, type: "outdoor", amenities: ["cctv", "security_guard"] },
  { name: "Natun Bazar Madani Avenue Parking", area: "Natun Bazar", address: "Madani Ave, Natun Bazar, Dhaka", lat: 23.7987, lng: 90.4262, slots: 4, rate: 30, type: "outdoor", amenities: ["cctv"] },
  { name: "Shahjadpur Plaza Parking", area: "Natun Bazar", address: "Shahjadpur, near Natun Bazar, Dhaka", lat: 23.7956, lng: 90.4242, slots: 6, rate: 50, type: "indoor", amenities: ["cctv", "covered", "security_guard", "washroom"] },

  // Khilkhet
  { name: "Khilkhet Bus Stand Parking", area: "Khilkhet", address: "Airport Road, Khilkhet Bus Stand, Dhaka", lat: 23.8296, lng: 90.4202, slots: 5, rate: 30, type: "outdoor", amenities: ["cctv"] },
  { name: "Khilkhet Bazar Parking", area: "Khilkhet", address: "Khilkhet Bazar, Dhaka", lat: 23.8275, lng: 90.4215, slots: 6, rate: 35, type: "outdoor", amenities: ["cctv", "security_guard"] },

  // Mohakhali
  { name: "Mohakhali Bus Terminal Parking", area: "Mohakhali", address: "Mohakhali Bus Terminal, Dhaka", lat: 23.7804, lng: 90.4006, slots: 6, rate: 30, type: "outdoor", amenities: ["cctv", "security_guard"] },
  { name: "Mohakhali DOHS Gate Parking", area: "Mohakhali", address: "Mohakhali DOHS Gate, Dhaka", lat: 23.7835, lng: 90.3972, slots: 4, rate: 40, type: "outdoor", amenities: ["cctv"] },
  { name: "Mohakhali Wireless Gate Parking", area: "Mohakhali", address: "Wireless Gate, Mohakhali, Dhaka", lat: 23.7818, lng: 90.4063, slots: 5, rate: 50, type: "indoor", amenities: ["cctv", "covered", "washroom"] },
];

/* ---------------- payloads ---------------- */

const FRAME = { width: 1280, height: 720 };

/** Slots A0…A(n-1) side by side across a 1280×720 frame, not overlapping. */
function cameraSlots(count) {
  const margin = 40;
  const gap = 20;
  const width = Math.floor((FRAME.width - 2 * margin - (count - 1) * gap) / count);
  return Array.from({ length: count }, (_, i) => ({
    slot_label: `A${i}`,
    vehicle_type: "car",
    bbox: { x: margin + i * (width + gap), y: 260, width, height: 300 },
  }));
}

function spacePayload(lot) {
  return {
    name: lot.name,
    description: `Demo parking lot in ${lot.area} with ${lot.slots} AI-monitored car slots (A0–A${lot.slots - 1}).`,
    address: lot.address,
    latitude: lot.lat,
    longitude: lot.lng,
    space_type: lot.type,
    total_capacity: lot.slots,
    base_rate_unit: lot.rate * 100,
    amenities: lot.amenities,
    operating_hours: ALL_DAY,
  };
}

function cameraPayload(lot) {
  return {
    label: `${lot.name} camera`,
    source_type: "video",
    frame_width: FRAME.width,
    frame_height: FRAME.height,
    slots: cameraSlots(lot.slots),
  };
}

/* ---------------- API ---------------- */

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = data?.message ?? data?.error ?? text;
    throw new Error(`${method} ${path} → ${res.status}: ${Array.isArray(message) ? message.join("; ") : message}`);
  }
  return data;
}

/** Unwraps `{ data: … }` envelopes some endpoints use. */
const unwrap = (value) => (value && typeof value === "object" && "data" in value && !Array.isArray(value) ? value.data : value);
const asList = (value) => {
  const v = unwrap(value);
  if (Array.isArray(v)) return v;
  return v?.items ?? v?.spaces ?? v?.results ?? [];
};

async function login(email, password) {
  const reply = unwrap(await call("POST", "/auth/login", { body: { email, password, device_name: "CityPulse seed script" } }));
  if (!reply?.access_token) throw new Error("Login worked but returned no access token.");
  const claims = JSON.parse(Buffer.from(reply.access_token.split(".")[1], "base64url").toString("utf8"));
  return { token: reply.access_token, role: claims.role, email: claims.email };
}

/* ---------------- terminal prompts ---------------- */

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (text) => {
        // keep the prompt, hide what is typed
        if (text.includes(question)) process.stdout.write(text);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function credentials(prefix, label) {
  const email = process.env[`${prefix}_EMAIL`] || (await ask(`${label} email: `));
  const password = process.env[`${prefix}_PASSWORD`] || (await ask(`${label} password: `, { hidden: true }));
  return { email, password };
}

/* ---------------- main ---------------- */

async function main() {
  const totalSlots = LOTS.reduce((t, l) => t + l.slots, 0);
  console.log(`CityPulse API: ${API}`);
  console.log(`${LOTS.length} demo lots, ${totalSlots} slots${DRY_RUN ? " (dry run: nothing is sent)" : ""}\n`);

  if (DRY_RUN) {
    for (const lot of LOTS) {
      console.log(`- ${lot.name.padEnd(36)} ${lot.area.padEnd(12)} A0–A${lot.slots - 1}  ৳${lot.rate}/h  ${lot.lat}, ${lot.lng}`);
    }
    console.log("\nExample requests for the first lot:");
    console.log("POST /spaces", JSON.stringify(spacePayload(LOTS[0])));
    console.log(`PUT /spaces/:id/rates/car {"hourly_rate_unit":${LOTS[0].rate * 100}}`);
    console.log("POST /spaces/:id/cameras", JSON.stringify(cameraPayload(LOTS[0])));
    return;
  }

  const ownerCreds = await credentials("OWNER", "Parking owner");
  const owner = await login(ownerCreds.email, ownerCreds.password);
  if (owner.role !== "owner") throw new Error(`${owner.email} is a "${owner.role}" account; sign in with a parking owner account.`);
  console.log(`Signed in as owner ${owner.email}\n`);

  const existing = asList(await call("GET", "/spaces", { token: owner.token }));
  const byName = new Map(existing.map((s) => [String(s.name).trim().toLowerCase(), s]));

  const demoIds = [];
  let created = 0;
  for (const lot of LOTS) {
    const known = byName.get(lot.name.toLowerCase());
    if (known) {
      console.log(`= ${lot.name}: already there, skipped`);
      demoIds.push(known.id);
      continue;
    }
    try {
      const space = unwrap(await call("POST", "/spaces", { token: owner.token, body: spacePayload(lot) }));
      const id = space?.id;
      if (!id) throw new Error("POST /spaces returned no id");
      await call("PUT", `/spaces/${id}/rates/car`, { token: owner.token, body: { hourly_rate_unit: lot.rate * 100 } });
      await call("POST", `/spaces/${id}/cameras`, { token: owner.token, body: cameraPayload(lot) });
      demoIds.push(id);
      created += 1;
      console.log(`+ ${lot.name}: created with slots A0–A${lot.slots - 1}`);
    } catch (error) {
      console.error(`! ${lot.name}: ${error.message}`);
    }
  }
  console.log(`\n${created} lot(s) created, ${LOTS.length - created} skipped or failed.`);

  if (!APPROVE) {
    console.log("New lots are pending approval. Re-run with --approve (admin account) to make them active.");
    return;
  }

  const adminCreds = await credentials("ADMIN", "Admin");
  const admin = await login(adminCreds.email, adminCreds.password);
  if (admin.role !== "admin") throw new Error(`${admin.email} is a "${admin.role}" account; --approve needs an admin account.`);
  let approved = 0;
  for (const id of demoIds) {
    try {
      await call("PATCH", `/admin/spaces/${id}/status`, { token: admin.token, body: { status: "active" } });
      approved += 1;
    } catch (error) {
      console.error(`! approve ${id}: ${error.message}`);
    }
  }
  console.log(`${approved} demo lot(s) set to active.`);
}

main().catch((error) => {
  console.error(`\nStopped: ${error.message}`);
  process.exit(1);
});
