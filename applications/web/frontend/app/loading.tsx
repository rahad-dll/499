import { DigitalHeartbeatLoader } from "@/components/loading/DigitalHeartbeatLoader";
import "@/components/loading/loader.css";

// Route-level loading UI shown by Next.js during page transitions —
// a fixed glass sheet: whatever is painted behind shows through blurred
export default function Loading() {
  return (
    <div className="nal-overlay nal-fixed">
      <span className="nal-blob teal" aria-hidden />
      <span className="nal-blob purple" aria-hidden />
      <DigitalHeartbeatLoader />
      <p className="nal-msg">Connecting to CityPulse...</p>
    </div>
  );
}
