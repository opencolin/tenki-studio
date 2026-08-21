"use client";

import { Stub } from "@/components/Stub";
import * as I from "@/components/Icons";

export default function Page() {
  return (
    <Stub
      breadcrumb="Agents Repository"
      title="Agents Repository"
      icon={I.People}
      blurb="Reusable agents you can drop into any crew, versioned separately from the automations that use them."
      planned={[
        "Publish an agent from the canvas",
        "Pin an agent version per project",
        "Share agents across the org",
      ]}
    />
  );
}