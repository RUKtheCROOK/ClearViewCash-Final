"use client";

import Link from "next/link";
import { EmptyScaffold } from "../components/states/EmptyScaffold";
import { StateHeader } from "../components/states/StateHeader";
import { StateScreen } from "../components/states/StateScreen";
import { IlloCloud } from "../components/states/illustrations";

export default function NotFound() {
  return (
    <StateScreen>
      <StateHeader title="Not found" sub="We couldn't find that page" />
      <EmptyScaffold
        illo={<IlloCloud />}
        accent="neg"
        eyebrow="PAGE NOT FOUND · 404"
        title="We couldn't find that page"
        body="The link may be old, or you may have followed a typo. Head home and try again."
        footnote={
          <Link
            href="/"
            style={{
              color: "var(--ink-2)",
              fontWeight: 500,
              textDecoration: "underline",
              fontFamily: "var(--font-ui)",
            }}
          >
            Go to home
          </Link>
        }
      />
    </StateScreen>
  );
}
