"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  deleteAccount as deleteAccountRow,
  getAccount,
  getAccountsForPlaidItem,
  getPlaidItem,
  getSharesForAccount,
  updateAccountSettings,
} from "@cvc/api-client";
import {
  ACCOUNT_ICON_KEYS,
  accountBalanceTone,
  accountDisplayName,
  accountKind,
  defaultAccountIcon,
  isAccountIconKey,
  isValidHexColor,
  readableTextOn,
} from "@cvc/domain";
import { I } from "../../../lib/icons";
import { openPlaidLink } from "../../../lib/plaid";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface AccountDetail {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
  type: string;
  subtype?: string | null;
  current_balance: number | null;
  plaid_item_id: string | null;
  color: string | null;
  icon: string | null;
}

interface ItemDetail {
  id: string;
  institution_name: string | null;
  status: string;
}

function fmtMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  return `${sign}$${abs.toFixed(2)}`;
}

function balanceColor(tone: ReturnType<typeof accountBalanceTone>): string {
  if (tone === "positive") return "var(--positive)";
  if (tone === "negative") return "var(--negative)";
  return "var(--text)";
}

export default function AccountSettings() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [siblingCount, setSiblingCount] = useState<number>(0);
  const [shareCount, setShareCount] = useState<number>(0);

  const [nameInput, setNameInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [iconInput, setIconInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const acc = (await getAccount(supabase, id)) as AccountDetail | null;
      setAccount(acc);
      setNameInput(acc?.display_name ?? "");
      setColorInput(acc?.color ?? "");
      setIconInput(acc?.icon ?? null);
      if (acc?.plaid_item_id) {
        const [itm, siblings] = await Promise.all([
          getPlaidItem(supabase, acc.plaid_item_id),
          getAccountsForPlaidItem(supabase, acc.plaid_item_id),
        ]);
        setItem(itm as ItemDetail | null);
        setSiblingCount(siblings.length);
      }
      const shares = await getSharesForAccount(supabase, id);
      setShareCount(shares.length);
    })();
  }, [id]);

  const colorValid = colorInput.trim() === "" || isValidHexColor(colorInput.trim());
  const swatchHex = isValidHexColor(colorInput.trim()) ? colorInput.trim() : null;

  async function save() {
    if (!account) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const trimmedName = nameInput.trim();
      const trimmedColor = colorInput.trim();
      if (trimmedColor && !isValidHexColor(trimmedColor)) {
        throw new Error('Color must be a hex value like "#0EA5E9".');
      }
      await updateAccountSettings(supabase, {
        id: account.id,
        display_name: trimmedName.length === 0 ? null : trimmedName,
        color: trimmedColor.length === 0 ? null : trimmedColor,
        icon: isAccountIconKey(iconInput) ? iconInput : null,
      });
      const refreshed = (await getAccount(supabase, account.id)) as AccountDetail | null;
      setAccount(refreshed);
      setNameInput(refreshed?.display_name ?? "");
      setColorInput(refreshed?.color ?? "");
      setIconInput(refreshed?.icon ?? null);
      setSaveMessage("Saved");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function clearCustomization() {
    if (!account) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateAccountSettings(supabase, {
        id: account.id,
        display_name: null,
        color: null,
        icon: null,
      });
      const refreshed = (await getAccount(supabase, account.id)) as AccountDetail | null;
      setAccount(refreshed);
      setNameInput("");
      setColorInput("");
      setIconInput(null);
      setSaveMessage("Cleared");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reconnect() {
    if (!account?.plaid_item_id) return;
    setReconnecting(true);
    setReconnectError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
        },
      );
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.link_token) {
        throw new Error(tokenJson.error ?? "could_not_start_reconnect");
      }
      await openPlaidLink(tokenJson.link_token);
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
      });
      const itm = await getPlaidItem(supabase, account.plaid_item_id);
      setItem(itm as ItemDetail | null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setReconnectError(msg);
    } finally {
      setReconnecting(false);
    }
  }

  async function performDelete() {
    if (!account) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (account.plaid_item_id && siblingCount <= 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-item-remove`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
        }
      } else {
        await deleteAccountRow(supabase, account.id);
      }
      router.push("/accounts");
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  }

  const tone = useMemo(
    () =>
      account
        ? accountBalanceTone({ type: account.type, current_balance: account.current_balance })
        : "neutral",
    [account],
  );

  if (!account) {
    return (
      <main className="container" style={{ padding: "32px 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  const status = item?.status;
  const needsReconnect = status === "error";

  return (
    <main className="container" style={{ padding: "32px 0", display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Account settings</h1>
        <Link href="/accounts" className="muted" style={{ fontSize: 14 }}>
          ← Accounts
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            background: isValidHexColor(account.color ?? null) ? (account.color as string) : "transparent",
            color: isValidHexColor(account.color ?? null) ? readableTextOn(account.color) : "var(--text)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong style={{ fontSize: 18 }}>{accountDisplayName(account)}</strong>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: isValidHexColor(account.color ?? null)
                ? readableTextOn(account.color)
                : balanceColor(tone),
            }}
          >
            {fmtMoney(account.current_balance)}
          </span>
        </div>
        <div style={{ padding: "12px 20px 16px" }} className="muted">
          {account.type}
          {account.mask ? ` · •••${account.mask}` : ""}
          {account.display_name ? ` · originally "${account.name}"` : ""}
        </div>
      </div>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Customize</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Override how this account appears in ClearViewCash. The bank's name remains{" "}
          <strong>{account.name}</strong>.
        </p>

        <label className="muted" style={{ fontSize: 13 }}>
          Display name
        </label>
        <input
          value={nameInput}
          placeholder={account.name}
          onChange={(e) => setNameInput(e.target.value)}
          style={inputStyle}
        />

        <label className="muted" style={{ fontSize: 13 }}>
          Card color (hex)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={colorInput}
            placeholder="#0EA5E9"
            onChange={(e) => setColorInput(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="color"
            value={isValidHexColor(colorInput.trim()) ? colorInput.trim() : "#0ea5e9"}
            onChange={(e) => setColorInput(e.target.value)}
            style={{
              width: 44,
              height: 44,
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 2,
              background: "var(--surface)",
              cursor: "pointer",
            }}
            aria-label="Pick color"
          />
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: swatchHex ?? "transparent",
            }}
          />
        </div>
        {!colorValid ? (
          <div style={{ color: "var(--negative)", fontSize: 12 }}>
            Enter a valid hex like #0EA5E9 or leave blank.
          </div>
        ) : null}

        <label className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Icon
        </label>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Default is the{" "}
          <strong>
            {defaultAccountIcon(
              accountKind({ type: account.type, subtype: account.subtype ?? null }),
            )}
          </strong>{" "}
          icon for {account.type} accounts.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setIconInput(null)}
            aria-label="Use default icon"
            style={iconBtnStyle(iconInput == null)}
          >
            <span style={{ fontSize: 10, color: "var(--ink-3)" }}>auto</span>
          </button>
          {ACCOUNT_ICON_KEYS.map((key) => {
            const Icon = (I as Record<string, (p: { color?: string; size?: number }) => JSX.Element>)[key];
            const selected = iconInput === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIconInput(key)}
                aria-label={`Use ${key} icon`}
                style={iconBtnStyle(selected)}
              >
                {Icon ? <Icon color="var(--ink-1)" size={20} /> : null}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={save}
            disabled={saving || !colorValid}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={clearCustomization}
            disabled={saving}
          >
            Clear customizations
          </button>
        </div>
        {saveMessage ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {saveMessage}
          </div>
        ) : null}
        {saveError ? (
          <div style={{ color: "var(--negative)", fontSize: 13 }}>{saveError}</div>
        ) : null}
      </section>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Connection</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>{item?.institution_name ?? "Unknown bank"}</span>
          {status ? (
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 999,
                background: needsReconnect ? "#F59E0B" : "var(--positive)",
                color: "white",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {needsReconnect ? "Needs reconnect" : "Synced"}
            </span>
          ) : null}
        </div>
        {needsReconnect && account.plaid_item_id ? (
          <div>
            <button
              className="btn btn-secondary"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={reconnect}
              disabled={reconnecting}
            >
              {reconnecting ? "Reconnecting…" : "Reconnect"}
            </button>
            {reconnectError ? (
              <div style={{ color: "var(--negative)", fontSize: 12, marginTop: 6 }}>
                {reconnectError}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Sharing</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {shareCount === 0
            ? "Private — not shared with any space."
            : `Shared with ${shareCount} space${shareCount === 1 ? "" : "s"}.`}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
          Manage sharing from the mobile app for now.
        </p>
      </section>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0, color: "var(--negative)" }}>Delete account</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Removes {accountDisplayName(account)} and its transactions from ClearViewCash.
          {account.plaid_item_id && siblingCount <= 1
            ? " This is the last account on this connected service, so the connection itself will also be removed."
            : ""}{" "}
          This cannot be undone.
        </p>
        {!confirming ? (
          <div>
            <button
              className="btn"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                background: "var(--negative)",
                color: "white",
              }}
              onClick={() => setConfirming(true)}
            >
              Delete this account
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--negative)", fontWeight: 600 }}>
              Final confirmation. There is no recovery after this.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  background: "var(--negative)",
                  color: "white",
                }}
                onClick={performDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
            {deleteError ? (
              <div style={{ color: "var(--negative)", fontSize: 13 }}>{deleteError}</div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 15,
  background: "var(--surface)",
  color: "var(--text)",
};

function iconBtnStyle(selected: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: selected ? "2px solid var(--text)" : "1px solid var(--border)",
    background: "var(--surface)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    padding: 0,
  };
}
