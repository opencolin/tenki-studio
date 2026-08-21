"use client";

import { Stub } from "@/components/Stub";
import * as I from "@/components/Icons";

export default function Page() {
  return (
    <Stub
      breadcrumb="Skills Repository"
      title="Skills Repository"
      icon={I.Book}
      blurb="Reusable instructions agents carry across Studio projects — published from the CLI and versioned like code."
      planned={[
        "tenki skill push from a repo",
        "Attach skills to any agent",
        "Roll back to a previous revision",
      ]}
    />
  );
}