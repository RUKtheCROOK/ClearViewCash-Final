export type AccountKind = "checking" | "savings" | "credit" | "invest" | "loan" | "other";

export function accountKind(a: {
  type: string | null | undefined;
  subtype?: string | null;
}): AccountKind {
  const sub = (a.subtype ?? "").toLowerCase();
  switch (a.type) {
    case "depository":
      if (sub.includes("saving")) return "savings";
      return "checking";
    case "credit":
      return "credit";
    case "loan":
      return "loan";
    case "investment":
      return "invest";
    default:
      return "other";
  }
}
