import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";

// NextAuth's endpoints: sign-in, sign-out and the session (/api/auth/*).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Sign-in and token refresh wait for the CityPulse API, which can take close
// to a minute to wake up on its free hosting tier.
export const maxDuration = 60;
