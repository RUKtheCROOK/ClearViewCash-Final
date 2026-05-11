"use client";

import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateScreen } from "../StateScreen";
import { IlloReceipt } from "../illustrations";

interface Props {
  onLink?: () => void;
  onAddManually?: () => void;
}

export function EmptyTransactions({ onLink, onAddManually }: Props) {
  return (
    <StateScreen>
      <StateHeader title="Transactions" sub="Nothing here yet" space={{ name: "Personal", hue: 195 }} />
      <EmptyScaffold
        illo={<IlloReceipt />}
        eyebrow="WAITING ON YOUR BANK"
        title="Transactions start flowing once you link an account"
        body="We pull in the last 24 months automatically. Most banks deliver the first batch in under a minute."
        primary={{ label: "Link an account", onPress: onLink }}
        secondary={{ label: "Add a transaction manually", onPress: onAddManually }}
        footnote="Already linked? Most banks post yesterday's transactions overnight."
      />
    </StateScreen>
  );
}
