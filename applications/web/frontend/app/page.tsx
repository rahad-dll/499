import Image from "next/image";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1.5rem",
      padding: "2rem",
      textAlign: "center",
    }}>
      <Image
        src="/logo.png"
        alt="CityPulse Logo"
        width={90}
        height={90}
        priority
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          CityPulse
        </h1>
        <p style={{ fontSize: "1rem", color: "#666", maxWidth: "420px" }}>
          Intelligent Parking &amp; Traffic Control Platform
        </p>
        <p style={{ fontSize: "0.875rem", color: "#999", maxWidth: "420px" }}>
          Connecting Drivers, Parking Owners &amp; Authorities for Smarter Cities
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
        <a
          href="/login"
          style={{
            padding: "0.6rem 1.4rem",
            background: "#171717",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Get Started
        </a>
        <a
          href="/about"
          style={{
            padding: "0.6rem 1.4rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Learn More
        </a>
      </div>
    </main>
  );
}
