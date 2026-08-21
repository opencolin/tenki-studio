"use client";

import { Stub } from "@/components/Stub";
import * as I from "@/components/Icons";

export default function Page() {
  return (
    <Stub
      breadcrumb="Settings"
      title="Settings"
      icon={I.Gear}
      blurb="Organization settings — members, roles, and the Tenki workspace every run is created in."
      planned={[
        "Bind a Tenki workspace and API key",
        "Owner / member roles",
        "Default sandbox size and egress policy",
      ]}
    />
  );
}