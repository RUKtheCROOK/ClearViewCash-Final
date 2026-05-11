"use client";

import type { ReactNode } from "react";
import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloCloud } from "../illustrations";

interface Props {
  title?: string;
  sub?: string;
  eyebrow?: string;
  bodyTitle?: string;
  body?: ReactNode;
  primary?: { label: string; onPress?: () => void };
  secondary?: { label: string; onPress?: () => void };
  referenceCode?: string;
  showHeader?: boolean;
}

export function FailedToLoad({
  title = "Reports",
  sub = "Couldn't open this report",
  eyebrow = "LOAD FAILED · CODE 503",
  bodyTitle = "We couldn't fetch your report",
  body = "Our reports service hiccupped. Your data is fine — this is on us. Try again in a moment, or come back later.",
  primary,
  secondary,
  referenceCode = "RPT-3309-4a",
  showHeader = true,
}: Props) {
  return (
    <StateScreen>
      {showHeader ? <StateHeader title={title} sub={sub} /> : null}
      <EmptyScaffold
        illo={<IlloCloud />}
        accent="neg"
        eyebrow={eyebrow}
        title={bodyTitle}
        body={body}
        primary={primary ?? { label: "Try again" }}
        secondary={secondary ?? { label: "Go back" }}
        footnote={
          <>
            If this keeps happening,{" "}
            <span style={{ color: "var(--ink-2)", fontWeight: 500, textDecoration: "underline" }}>let us know</span>{" "}
            with reference <StateMono style={{ color: "var(--ink-2)" }}>{referenceCode}</StateMono>.
          </>
        }
      />
    </StateScreen>
  );
}
