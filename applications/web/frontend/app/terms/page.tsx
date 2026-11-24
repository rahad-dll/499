import type { Metadata } from "next";
import { REPO_URL } from "@/components/landing/data";
import { LegalPage, type LegalSection } from "@/components/landing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — CityPulse",
  description: "The rules for using CityPulse, a student-built parking and traffic platform.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About CityPulse",
    body: (
      <p>
        CityPulse is a prototype built as a university project. Features may change or be removed, the service may be
        slow or unavailable at times (the free server sleeps when idle and takes up to a minute to wake), and data may
        be reset. Please don&apos;t rely on it for anything critical.
      </p>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>Give accurate details and choose the role that matches how you will use CityPulse.</li>
        <li>Keep your password private. You are responsible for what happens under your account.</li>
        <li>Accounts that misuse the service may be suspended or removed.</li>
      </ul>
    ),
  },
  {
    id: "owners",
    title: "Parking owners",
    body: (
      <ul>
        <li>Only register parking lots you own or are allowed to manage.</li>
        <li>
          Only connect cameras you are allowed to use, pointed at the parking area — never at homes, offices or other
          private spaces.
        </li>
        <li>Keep your lot&apos;s prices, opening hours and details honest and up to date.</li>
        <li>You are responsible for following the laws that apply to your lot and its cameras.</li>
      </ul>
    ),
  },
  {
    id: "authorities",
    title: "Traffic authorities",
    body: (
      <p>
        Alerts, stress levels and &ldquo;unbooked occupancy&rdquo; incidents are worked out automatically from AI
        camera readings and can be wrong. Treat them as leads to check, and confirm on the ground before taking any
        action against a driver or an owner.
      </p>
    ),
  },
  {
    id: "drivers",
    title: "Drivers and bookings",
    body: (
      <ul>
        <li>Free-slot counts are AI estimates — a slot shown as free may be taken by the time you arrive.</li>
        <li>
          Bookings record a payment method, but CityPulse does not process real online payments yet. Settle any
          payment directly with the parking lot.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <ul>
        <li>Don&apos;t try to break into, overload or copy the service in bulk.</li>
        <li>Don&apos;t upload photos or footage you don&apos;t have the right to share, or anything illegal.</li>
        <li>Don&apos;t pretend to be another person, business or authority.</li>
      </ul>
    ),
  },
  {
    id: "warranty",
    title: "No guarantees",
    body: (
      <p>
        CityPulse is provided &ldquo;as is&rdquo; for learning and demonstration, without any warranty. As far as the
        law allows, the project team is not responsible for losses that come from using it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        These terms may change as the project develops; this page and its date will be updated when they do.
        Questions are welcome on{" "}
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
          the project&apos;s GitHub page
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      updated="31 October 2026"
      intro={
        <p>
          These terms explain the rules for using CityPulse, a parking and traffic platform built by CSE499A/B Project
          Group 03 at North South University. By creating an account you agree to them.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
