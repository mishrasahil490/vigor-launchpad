import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * MaskedField – shows a masked placeholder by default.
 * The user must click the eye icon to reveal the actual value.
 * Used for email, phone/contact, and other sensitive fields in preview tables.
 */
export function maskEmail(val) {
  if (!val) return "—";
  const str = String(val);
  if (str.includes("@")) {
    // Email masking: show first 2 chars + **** + domain
    const [local, domain] = str.split("@");
    const masked = local.slice(0, 2) + "****";
    return `${masked}@${domain}`;
  }
  return "****";
}

export function maskPhone(val) {
  if (!val) return "—";
  const str = String(val);
  // Phone/number masking: show first 2 digits + **** + last 2
  if (str.length > 6) {
    return str.slice(0, 2) + "****" + str.slice(-2);
  }
  return "****";
}

export default function MaskedField({ value, label }) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return <span className="text-ink-400">—</span>;

  function maskValue(val) {
    if (String(val).includes("@")) {
      return maskEmail(val);
    }
    return maskPhone(val);
  }

  return (
    <span className="inline-flex items-center gap-1 group">
      <span className={`${revealed ? "text-ink-800 dark:text-white" : "text-ink-400 tracking-widest"} text-sm`}>
        {revealed ? value : maskValue(value)}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-ink-300 hover:text-brand-500 dark:text-ink-600 dark:hover:text-brand-400 transition-colors shrink-0"
        title={revealed ? "Hide" : "Reveal"}
        aria-label={`${revealed ? "Hide" : "Reveal"} ${label || "field"}`}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );
}
