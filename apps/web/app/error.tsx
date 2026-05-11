"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FailedToLoad } from "../components/states";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const code = error.digest ? error.digest.slice(0, 8) : "500";

  return (
    <FailedToLoad
      title="Something went wrong"
      sub="We couldn't render this page"
      eyebrow={`LOAD FAILED · CODE ${code.toUpperCase()}`}
      bodyTitle="We hit a snag rendering this page"
      body="Your data is fine — this is on us. Try again in a moment, or come back later."
      primary={{ label: "Try again", onPress: () => reset() }}
      secondary={{ label: "Go back", onPress: () => router.back() }}
      referenceCode={error.digest ?? "n/a"}
    />
  );
}
