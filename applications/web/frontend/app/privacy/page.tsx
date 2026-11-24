import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/components/landing/data";
import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — CityPulse",
  description: "What the CityPulse website and API store about you, why, and how to have it removed.",
};

const ISSUES_URL = `${REPO_URL}/issues`;

/* Keep in step with what the app really stores: lib/auth, lib/profiles,
   lib/spaces, lib/bookings, lib/theme.ts and components/landing/city3d.ts. */
const SECTIONS: LegalSection[] = [
  {
    id: "collect",
    title: "What we store",
    body: (
      <ul>
        <li>
          <strong>Account details:</strong> your full name, email address, mobile number and the role you choose
          (driver, parking owner or traffic authority). Your password is stored only as a one-way bcrypt hash, so
          nobody — including the team — can read it.
        </li>
        <li>
          <strong>Profile details you add:</strong> business name and address for parking owners; organisation and
          badge number for traffic authorities.
        </li>
        <li>
          <strong>Signed-in devices:</strong> for each active sign-in, the browser or device name and the IP address
          it signed in from, so you can review them and sign devices out on your profile page.
        </li>
        <li>
          <strong>Parking lots (owners):</strong> the lot&apos;s name, address, map location, capacity, opening hours
          and prices, its photos, its camera stream (RTSP) addresses, and the footage or snapshots you upload to mark
          the slots.
        </li>
        <li>
          <strong>Bookings:</strong> the lot and slot, the booked times, the vehicle&apos;s number plate, the amount
          and the payment method and status.
        </li>
      </ul>
    ),
  },
  {
    id: "ai",
    title: "Camera footage and AI",
    body: (
      <>
        <p>
          The AI reads frames from a lot&apos;s camera to decide whether each marked slot is free or occupied, and a
          separate model detects licence plates. Logs of these AI checks are deleted automatically after 30 days.
        </p>
        <p>
          Owners must only connect cameras they are allowed to use, pointed at parking areas — see the{" "}
          <Link href="/terms#owners">Terms of Service</Link>.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How it is used and who sees it",
    body: (
      <ul>
        <li>To run CityPulse: signing you in, showing owners their lots and bookings, and showing live availability.</li>
        <li>
          <strong>Public:</strong> for active lots, the name, address, map location, prices and live free/occupied
          slot counts. This is what drivers and the traffic-authority command center see.
        </li>
        <li>
          <strong>Not public:</strong> your contact details, password, devices, camera addresses and booking history.
        </li>
        <li>We don&apos;t sell your data and don&apos;t use it for advertising.</li>
      </ul>
    ),
  },
  {
    id: "browser",
    title: "What is kept in your browser",
    body: (
      <ul>
        <li>
          Your sign-in tokens, in session storage (cleared when you close the tab), or in local storage when you tick
          &ldquo;Remember me&rdquo;.
        </li>
        <li>Your theme choice and whether you prefer the classic or the 3D landing page.</li>
        <li>There are no advertising or third-party tracking cookies.</li>
      </ul>
    ),
  },
  {
    id: "services",
    title: "Services we rely on",
    body: (
      <ul>
        <li>The website is hosted on Vercel and the API on Render.</li>
        <li>
          Maps are drawn with OpenStreetMap tiles, which your browser loads from OpenStreetMap&apos;s servers. When you
          look up an address while registering a lot, the address you typed is sent to OpenStreetMap&apos;s Nominatim
          search service.
        </li>
      </ul>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    body: (
      <>
        <p>
          You can edit your profile, sign out other devices, and delete your parking lots and their photos at any time
          from the portals.
        </p>
        <p>
          To have your whole account deleted, or to get a copy of your data, contact the team through{" "}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            the project&apos;s GitHub page
          </a>
          . Because CityPulse is a student project, its database may also be reset or removed when the project ends.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        If what CityPulse stores changes, this page and its date will be updated. Questions are welcome on{" "}
        <a href={ISSUES_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="31 October 2026"
      intro={
        <p>
          CityPulse is a final-year student project (CSE499A/B, Project Group 03, North South University), not a
          commercial service. This page explains in plain language what the CityPulse website and API store about you
          and why.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
