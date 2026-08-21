"use client";

import { Stub } from "@/components/Stub";
import * as I from "@/components/Icons";

export default function Page() {
  return (
    <Stub
      breadcrumb="Billing"
      title="Billing"
      icon={I.Card}
      blurb="Sandbox seconds are metered per run today; self-serve payment and invoices come after the beta."
      planned={[
        "Per-run cost breakdown",
        "Monthly caps with a hard stop",
        "Invoices and receipts",
      ]}
    />
  );
}