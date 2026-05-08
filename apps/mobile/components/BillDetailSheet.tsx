import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  bucketForBill,
  daysUntilDue,
  formatLongDate,
  formatShortDate,
  resolveBillBranding,
  todayIso,
} from "@cvc/domain";
import {
  deleteBill,
  getAccountsForView,
  getBillPayments,
  getBillReminders,
  recordBillPayment,
  setBillReminder,
  undoBillPayment,
  type BillReminderRow,
} from "@cvc/api-client";
import type { Cadence } from "@cvc/types";
import { fonts, type Palette } from "@cvc/ui";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { BillIcon } from "./bills/BillIcon";
import { Num, fmtMoneyDollars } from "./bills/Num";
import { SwitchRow } from "./bills/SwitchRow";

interface Props {
  visible: boolean;
  billId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
}

interface BillFull {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: Cadence;
  autopay: boolean;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
  notes: string | null;
  linked_account_id: string | null;
  source: "manual" | "detected";
}

interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string;
  status: "paid" | "overdue" | "skipped";
  transaction_id: string | null;
  prev_next_due_at: string | null;
}

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

function accountLabel(accounts: AccountLite[], id: string | null): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  return a.mask ? `${name.split(/\s+/).slice(0, 2).join(" ")} ··${a.mask}` : name;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BillDetailSheet({ visible, billId, onClose, onChanged, onEdit }: Props) {
  const { palette, mode } = useTheme();
  const today = todayIso();
  const [bill, setBill] = useState<BillFull | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [reminders, setReminders] = useState<BillReminderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(async () => {
    if (!visible || !billId) return;
    const { data, error: e } = await supabase.from("bills").select("*").eq("id", billId).single();
    if (e || !data) {
      setError(e?.message ?? "Bill not found");
      return;
    }
    setBill(data as BillFull);
    const [pays, rems, accts] = await Promise.all([
      getBillPayments(supabase, billId),
      getBillReminders(supabase, billId),
      getAccountsForView(supabase, { spaceId: data.space_id, sharedView: false }),
    ]);
    setPayments(pays as PaymentRow[]);
    setReminders(rems);
    setAccounts(
      (accts as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map((a) => ({
        id: a.id, name: a.name, display_name: a.display_name, mask: a.mask,
      })),
    );
  }, [visible, billId]);

  useEffect(() => {
    if (!visible) {
      setBill(null);
      setPayments([]);
      setReminders([]);
      setError(null);
      return;
    }
    reload();
  }, [visible, reload, reloadCount]);

  const branding = useMemo(
    () => (bill ? resolveBillBranding(bill) : { hue: 220, glyph: "doc" as const }),
    [bill],
  );

  const sortedPays = useMemo(
    () => [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at)),
    [payments],
  );

  const avgCents = payments.length === 0 ? null : Math.round(payments.reduce((s, p) => s + p.amount, 0) / payments.length);
  const sparkData = [...sortedPays.slice(0, 6)].reverse();

  function reminderState(kind: BillReminderRow["kind"], days_before: number | null) {
    const r = reminders.find((x) => x.kind === kind && (x.days_before ?? null) === days_before);
    return { exists: !!r, enabled: !!r?.enabled };
  }

  async function toggleReminder(kind: BillReminderRow["kind"], days_before: number | null, enabled: boolean) {
    if (!bill) return;
    setBusy(`rem-${kind}-${days_before ?? "x"}`);
    setError(null);
    try {
      await setBillReminder(supabase, { bill_id: bill.id, kind, days_before, enabled });
      setReloadCount((c) => c + 1);
      onChanged();
    } catch (e) {
      setError((e as Error).message ?? "Could not update reminder.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAutopay() {
    if (!bill) return;
    setBusy("autopay");
    try {
      const { error: e } = await supabase.from("bills").update({ autopay: !bill.autopay }).eq("id", bill.id);
      if (e) throw e;
      setReloadCount((c) => c + 1);
      onChanged();
    } catch (e) {
      setError((e as Error).message ?? "Could not toggle autopay.");
    } finally {
      setBusy(null);
    }
  }

  async function markPaid() {
    if (!bill) return;
    setBusy("pay");
    try {
      await recordBillPayment(supabase, {
        bill_id: bill.id,
        amount: bill.amount,
        paid_at: today,
        cadence: bill.cadence,
        current_next_due_at: bill.next_due_at,
      });
      setReloadCount((c) => c + 1);
      onChanged();
    } catch (e) {
      setError((e as Error).message ?? "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  async function unmarkPaid() {
    if (!bill) return;
    const latest = sortedPays[0];
    if (!latest) return;
    setBusy("pay");
    try {
      await undoBillPayment(supabase, {
        payment_id: latest.id,
        bill_id: bill.id,
        cadence: bill.cadence,
        current_next_due_at: bill.next_due_at,
        prev_next_due_at: latest.prev_next_due_at,
      });
      setReloadCount((c) => c + 1);
      onChanged();
    } catch (e) {
      setError((e as Error).message ?? "Could not unmark paid.");
    } finally {
      setBusy(null);
    }
  }

  const detailBucket = useMemo(() => {
    if (!bill) return null;
    const latest = sortedPays[0];
    return bucketForBill(
      {
        next_due_at: bill.next_due_at,
        amount: bill.amount,
        autopay: bill.autopay,
        latest_payment: latest ? { paid_at: latest.paid_at } : null,
      },
      today,
    );
  }, [bill, sortedPays, today]);

  function confirmDelete() {
    if (!bill) return;
    Alert.alert("Delete bill?", "Payment history will be kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!bill) return;
          setBusy("delete");
          try {
            await deleteBill(supabase, bill.id);
            onChanged();
            onClose();
          } catch (e) {
            setError((e as Error).message ?? "Could not delete bill.");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  if (!visible) return null;

  const accountText = bill ? accountLabel(accounts, bill.linked_account_id) : null;
  const dueDays = bill ? daysUntilDue(bill.next_due_at, today) : 0;
  const dueLabel =
    dueDays < 0
      ? `${Math.abs(dueDays)} day${Math.abs(dueDays) === 1 ? "" : "s"} late`
      : dueDays === 0
        ? "today"
        : `${dueDays} day${dueDays === 1 ? "" : "s"}`;

  const reminder3d = reminderState("days_before", 3);
  const reminderDue = reminderState("on_due_date", null);
  const reminderMute = reminderState("mute_all", null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 8 : 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: palette.tinted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onEdit}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: palette.tinted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke={palette.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {!bill ? (
            <Text style={{ padding: 24, color: palette.ink3 }}>{error ?? "Loading…"}</Text>
          ) : (
            <>
              {/* Hero */}
              <View style={{ paddingHorizontal: 24, paddingVertical: 18, alignItems: "center" }}>
                <View style={{ marginBottom: 14 }}>
                  <BillIcon hue={branding.hue} glyph={branding.glyph} mode={mode} size={64} radius={16} />
                </View>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 22, fontWeight: "500", color: palette.ink1, letterSpacing: -0.2 }}>
                  {bill.name}
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3, marginTop: 4 }}>
                  {[bill.category, bill.cadence].filter(Boolean).join(" · ")}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 11,
                    color: palette.ink3,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginTop: 18,
                  }}
                >
                  Next due
                </Text>
                <Num style={{ fontSize: 34, fontWeight: "600", color: palette.ink1, letterSpacing: -0.4, marginTop: 4 }}>
                  {fmtMoneyDollars(bill.amount)}
                </Num>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2, marginTop: 4, textAlign: "center" }}>
                  {formatShortDate(bill.next_due_at)} · {dueLabel}
                  {bill.autopay && accountText ? (
                    <Text style={{ color: palette.brand, fontWeight: "500" }}> · Autopay from {accountText}</Text>
                  ) : accountText ? (
                    <Text> · From {accountText}</Text>
                  ) : null}
                </Text>
              </View>

              {/* Quick actions */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 18, flexDirection: "row", gap: 8 }}>
                {detailBucket === "paid" ? (
                  <ActionBtn
                    label={busy === "pay" ? "Saving…" : "Unmark paid"}
                    onPress={unmarkPaid}
                    disabled={busy === "pay"}
                    palette={palette}
                    icon={
                      <Svg width={16} height={16} viewBox="0 0 24 24">
                        <Path d="M9 14l-5-5 5-5" fill="none" stroke={palette.ink1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M4 9h11a5 5 0 010 10h-3" fill="none" stroke={palette.ink1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    }
                  />
                ) : (
                  <ActionBtn
                    label={busy === "pay" ? "Saving…" : "Mark paid"}
                    onPress={markPaid}
                    disabled={busy === "pay"}
                    palette={palette}
                    icon={
                      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M5 12l4 4 10-10" fill="none" stroke={palette.ink1} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                    }
                  />
                )}
                <ActionBtn
                  label="Edit"
                  onPress={onEdit}
                  palette={palette}
                  icon={
                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke={palette.ink1} strokeWidth={1.8} strokeLinecap="round" /></Svg>
                  }
                />
                <ActionBtn
                  label={bill.autopay ? "Autopay on" : "Autopay off"}
                  onPress={toggleAutopay}
                  disabled={busy === "autopay"}
                  tinted
                  palette={palette}
                  icon={
                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={palette.brand} /></Svg>
                  }
                />
              </View>

              {/* History header */}
              <View style={{ paddingHorizontal: 18, flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 8 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "600", color: palette.ink1, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Payment history
                </Text>
                <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>
                  {payments.length === 0 ? "none yet" : `last ${Math.min(6, payments.length)}`}
                </Text>
                <View style={{ flex: 1 }} />
                {avgCents != null ? (
                  <Text style={{ fontFamily: fonts.num, fontSize: 11.5, color: palette.ink2 }}>avg {fmtMoneyDollars(avgCents)}</Text>
                ) : null}
              </View>

              {sparkData.length > 0 ? (
                <Sparkline data={sparkData} palette={palette} />
              ) : (
                <View style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
                  <View
                    style={{
                      backgroundColor: palette.surface,
                      borderWidth: 1,
                      borderColor: palette.line,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <Text style={{ color: palette.ink3, fontSize: 12.5, fontFamily: fonts.ui, textAlign: "center" }}>
                      No payments recorded yet. Tap “Mark paid” after this bill clears.
                    </Text>
                  </View>
                </View>
              )}

              {sortedPays.length > 0 ? (
                <View
                  style={{
                    marginTop: 14,
                    backgroundColor: palette.surface,
                    borderTopWidth: 1,
                    borderTopColor: palette.line,
                    borderBottomWidth: 1,
                    borderBottomColor: palette.line,
                  }}
                >
                  {sortedPays.slice(0, 8).map((p, i) => (
                    <View
                      key={p.id}
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        borderBottomWidth: i === Math.min(sortedPays.length, 8) - 1 ? 0 : 1,
                        borderBottomColor: palette.line,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: p.status === "paid" ? palette.posTint : palette.tinted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M5 12l4 4 10-10" fill="none" stroke={p.status === "paid" ? palette.pos : palette.ink3} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink1 }}>{formatLongDate(p.paid_at)}</Text>
                        <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, marginTop: 1 }}>
                          {bill.autopay ? "Autopay" : "Manual"}
                          {accountText ? ` · ${accountText}` : ""}
                        </Text>
                      </View>
                      <Num style={{ fontSize: 13.5, fontWeight: "500", color: palette.ink2 }}>−{fmtMoneyDollars(p.amount)}</Num>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Reminders */}
              <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                <Text
                  style={{
                    paddingHorizontal: 4,
                    paddingBottom: 8,
                    fontFamily: fonts.uiMedium,
                    fontSize: 12,
                    fontWeight: "600",
                    color: palette.ink1,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Reminders
                </Text>
                <View
                  style={{
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.line,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <SwitchRow
                    palette={palette}
                    icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 8a6 6 0 1112 0v5l2 3H4l2-3V8z M10 19a2 2 0 004 0" fill="none" stroke={palette.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    title="3 days before due"
                    subtitle={`${formatShortDate(addDays(bill.next_due_at, -3))} · 9:00 AM`}
                    on={reminder3d.exists && reminder3d.enabled}
                    onToggle={(on) => toggleReminder("days_before", 3, on)}
                  />
                  <SwitchRow
                    palette={palette}
                    icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 8a6 6 0 1112 0v5l2 3H4l2-3V8z M10 19a2 2 0 004 0" fill="none" stroke={palette.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
                    title="On due date"
                    subtitle={`${formatShortDate(bill.next_due_at)} · 9:00 AM`}
                    on={reminderDue.exists && reminderDue.enabled}
                    onToggle={(on) => toggleReminder("on_due_date", null, on)}
                  />
                  <SwitchRow
                    palette={palette}
                    icon={<Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M3 3l18 18 M6 8a6 6 0 0110-4 M18 13l2 3H8" fill="none" stroke={palette.ink2} strokeWidth={1.8} strokeLinecap="round" /></Svg>}
                    title="Mute all reminders"
                    subtitle="Useful while autopay is on"
                    on={reminderMute.exists && reminderMute.enabled}
                    onToggle={(on) => toggleReminder("mute_all", null, on)}
                    last
                  />
                </View>
              </View>

              {/* Notes */}
              {bill.notes ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                  <Text
                    style={{
                      paddingHorizontal: 4,
                      paddingBottom: 8,
                      fontFamily: fonts.uiMedium,
                      fontSize: 12,
                      fontWeight: "600",
                      color: palette.ink1,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Notes
                  </Text>
                  <View
                    style={{
                      backgroundColor: palette.surface,
                      borderWidth: 1,
                      borderColor: palette.line,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2, lineHeight: 19 }}>{bill.notes}</Text>
                  </View>
                </View>
              ) : null}

              {error ? <Text style={{ color: palette.neg, paddingHorizontal: 16, paddingTop: 12, fontSize: 12 }}>{error}</Text> : null}

              {/* Delete */}
              <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                <Pressable
                  onPress={confirmDelete}
                  disabled={busy === "delete"}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.lineFirm,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke={palette.neg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.neg }}>
                    {busy === "delete" ? "Deleting…" : "Delete bill"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Sparkline({ data, palette }: { data: PaymentRow[]; palette: Palette }) {
  const W = 320;
  const H = 64;
  const padX = 16;
  const max = Math.max(...data.map((p) => p.amount), 1);
  const barW = data.length === 0 ? 0 : (W - padX * 2) / data.length - 8;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: 6 }}>
      <View
        style={{
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: 12,
          padding: 12,
        }}
      >
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <Line x1={0} y1={H - 6} x2={W} y2={H - 6} stroke={palette.lineFirm} strokeWidth={1} />
          {data.map((p, i) => {
            const x = padX + i * (barW + 8);
            const h = Math.max(4, (p.amount / max) * (H - 18));
            const isLast = i === data.length - 1;
            const date = new Date(`${p.paid_at}T00:00:00`);
            return (
              <>
                <Rect key={`r-${p.id}`} x={x} y={H - 6 - h} width={barW} height={h} rx={4} fill={isLast ? palette.brand : palette.tinted} />
                <SvgText
                  key={`t-${p.id}`}
                  x={x + barW / 2}
                  y={H - 0}
                  textAnchor="middle"
                  fontSize={9}
                  fill={palette.ink3}
                  fontFamily={fonts.num}
                >
                  {months[date.getMonth()]}
                </SvgText>
              </>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  icon,
  tinted,
  onPress,
  disabled,
  palette,
}: {
  label: string;
  icon: React.ReactNode;
  tinted?: boolean;
  onPress: () => void;
  disabled?: boolean;
  palette: Palette;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: tinted ? palette.brandTint : palette.tinted,
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: tinted ? palette.brand : palette.ink1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
