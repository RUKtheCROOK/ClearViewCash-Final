import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import {
  I,
  Text,
  type IconKey,
} from "@cvc/ui";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/store";
import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface NotificationRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface ToneSpec {
  fg: string;
  tint: string;
  icon: IconKey;
  label: string;
  urgent?: boolean;
}

function toneFor(
  kind: string,
  palette: ReturnType<typeof useTheme>["palette"],
): ToneSpec {
  const map: Record<string, ToneSpec> = {
    "bill-due": { fg: palette.brand, tint: palette.brandTint, icon: "bill", label: "BILL" },
    "bill-overdue": {
      fg: palette.neg,
      tint: palette.negTint,
      icon: "alert",
      label: "OVERDUE",
      urgent: true,
    },
    "low-balance": {
      fg: palette.warn,
      tint: palette.warnTint,
      icon: "arrowDown",
      label: "LOW BAL",
      urgent: true,
    },
    "large-txn": {
      fg: palette.accent,
      tint: palette.accentTint,
      icon: "arrowUp",
      label: "LARGE TXN",
    },
    "sync-fail": {
      fg: palette.neg,
      tint: palette.negTint,
      icon: "syncErr",
      label: "SYNC",
      urgent: true,
    },
    "milestone": { fg: palette.pos, tint: palette.posTint, icon: "star", label: "GOAL" },
    "shared": { fg: palette.info, tint: palette.infoTint, icon: "share", label: "SHARED" },
    "summary": { fg: palette.info, tint: palette.infoTint, icon: "summary", label: "WEEKLY" },
  };
  return map[kind] ?? {
    fg: palette.brand,
    tint: palette.brandTint,
    icon: "bell",
    label: kind.toUpperCase(),
  };
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 2) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const dt = new Date(iso);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bucket(iso: string): "today" | "yesterday" | "earlier" {
  const created = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  if (created >= startOfToday) return "today";
  if (created >= startOfYesterday) return "yesterday";
  return "earlier";
}

export function NotificationsDrawer({ visible, onClose }: Props) {
  const { palette } = useTheme();
  const bumpNotifications = useApp((s) => s.bumpNotifications);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    getMyNotifications(supabase, { limit: 50 })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = useMemo(
    () => (filter === "unread" ? rows.filter((r) => !r.read_at) : rows),
    [rows, filter],
  );

  const grouped = useMemo(() => {
    const t: NotificationRow[] = [];
    const y: NotificationRow[] = [];
    const e: NotificationRow[] = [];
    for (const r of filtered) {
      const b = bucket(r.created_at);
      if (b === "today") t.push(r);
      else if (b === "yesterday") y.push(r);
      else e.push(r);
    }
    return { today: t, yesterday: y, earlier: e };
  }, [filtered]);

  const unreadCount = rows.filter((r) => !r.read_at).length;
  const urgentUnread = rows.filter(
    (r) => !r.read_at && toneFor(r.kind, palette).urgent,
  ).length;

  async function onPressRow(row: NotificationRow) {
    if (!row.read_at) {
      try {
        await markNotificationRead(supabase, row.id);
        setRows((current) =>
          current.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)),
        );
        bumpNotifications();
      } catch {
        // Best effort — the bell will resync on the next poll.
      }
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead(supabase);
      const stamp = new Date().toISOString();
      setRows((current) => current.map((r) => (r.read_at ? r : { ...r, read_at: stamp })));
      bumpNotifications();
    } catch {
      // ignore
    }
  }

  function close() {
    onClose();
    bumpNotifications();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.32)" }}>
        <Pressable
          onPress={() => undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: palette.canvas,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            maxHeight: "92%",
          }}
        >
          <View style={{ paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: palette.brandTint,
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <I.bell color={palette.brand} size={18} />
                {unreadCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      minWidth: 16,
                      height: 16,
                      paddingHorizontal: 4,
                      borderRadius: 999,
                      backgroundColor: palette.neg,
                      borderColor: palette.canvas,
                      borderWidth: 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: 9, fontWeight: "700" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 17, fontWeight: "500", color: palette.ink1 }}>
                  Notifications
                </Text>
                <Text style={{ fontSize: 11.5, color: palette.ink3, marginTop: 1 }}>
                  {unreadCount === 0 && rows.length === 0
                    ? loading
                      ? "Loading…"
                      : "All caught up"
                    : `${unreadCount} unread · ${rows.length} total`}
                </Text>
              </View>
              <Pressable
                onPress={close}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: palette.tinted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.close color={palette.ink2} />
              </Pressable>
            </View>

            {rows.length > 0 ? (
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={onMarkAllRead}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: palette.surface,
                    borderColor: palette.line,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "500", color: palette.ink1 }}>
                    Mark all read
                  </Text>
                </Pressable>
                <FilterChip
                  label="All"
                  active={filter === "all"}
                  onPress={() => setFilter("all")}
                  palette={palette}
                />
                <FilterChip
                  label={`Unread · ${unreadCount}`}
                  active={filter === "unread"}
                  onPress={() => setFilter("unread")}
                  palette={palette}
                />
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => {
                    close();
                    router.push("/settings/notifications");
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    backgroundColor: palette.tinted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <I.gear color={palette.ink2} size={14} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <ScrollView style={{ maxHeight: 540 }}>
            {urgentUnread > 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <View
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: palette.negTint,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.neg }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "600", color: palette.ink1 }}>
                      {urgentUnread} need{urgentUnread === 1 ? "s" : ""} your attention
                    </Text>
                  </View>
                  <I.chevR color={palette.neg} />
                </View>
              </View>
            ) : null}

            {grouped.today.length > 0 ? (
              <Group label="TODAY" count={grouped.today.length} palette={palette}>
                {grouped.today.map((r, i, arr) => (
                  <Row
                    key={r.id}
                    row={r}
                    last={i === arr.length - 1}
                    palette={palette}
                    onPress={() => onPressRow(r)}
                  />
                ))}
              </Group>
            ) : null}

            {grouped.yesterday.length > 0 ? (
              <Group label="YESTERDAY" count={grouped.yesterday.length} palette={palette}>
                {grouped.yesterday.map((r, i, arr) => (
                  <Row
                    key={r.id}
                    row={r}
                    last={i === arr.length - 1}
                    palette={palette}
                    onPress={() => onPressRow(r)}
                  />
                ))}
              </Group>
            ) : null}

            {grouped.earlier.length > 0 ? (
              <Group label="EARLIER" count={grouped.earlier.length} palette={palette}>
                {grouped.earlier.map((r, i, arr) => (
                  <Row
                    key={r.id}
                    row={r}
                    last={i === arr.length - 1}
                    palette={palette}
                    onPress={() => onPressRow(r)}
                  />
                ))}
              </Group>
            ) : null}

            {filtered.length === 0 && !loading ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
                  You're all caught up
                </Text>
                <Text style={{ fontSize: 13, color: palette.ink3, marginTop: 6, textAlign: "center" }}>
                  Nothing to look at right now.
                </Text>
              </View>
            ) : null}

            <View style={{ height: 24 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTheme>["palette"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? palette.brandTint : palette.surface,
        borderColor: active ? palette.brand : palette.line,
        borderWidth: 1,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? "600" : "500",
          color: active ? palette.brand : palette.ink2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Group({
  label,
  count,
  palette,
  children,
}: {
  label: string;
  count: number;
  palette: ReturnType<typeof useTheme>["palette"];
  children: React.ReactNode;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 8 }}>
        <Text style={{ fontSize: 10, color: palette.ink3, letterSpacing: 1, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ fontSize: 10, color: palette.ink4 }}>·</Text>
        <Text style={{ fontSize: 10, color: palette.ink4 }}>{count}</Text>
      </View>
      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: palette.surface,
          borderRadius: 14,
          borderColor: palette.line,
          borderWidth: 1,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  row,
  last,
  palette,
  onPress,
}: {
  row: NotificationRow;
  last: boolean;
  palette: ReturnType<typeof useTheme>["palette"];
  onPress: () => void;
}) {
  const tone = toneFor(row.kind, palette);
  const Icon = I[tone.icon];
  const unread = !row.read_at;
  const isUrgent = !!tone.urgent;
  const payload = row.payload ?? {};
  const title =
    typeof payload.title === "string" ? payload.title : row.kind.replace(/-/g, " ");
  const body = typeof payload.body === "string" ? payload.body : "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomColor: palette.line,
        borderBottomWidth: last ? 0 : 1,
        borderLeftColor: isUrgent && unread ? tone.fg : "transparent",
        borderLeftWidth: 3,
        backgroundColor: pressed ? palette.tinted : "transparent",
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: tone.tint,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Icon color={tone.fg} size={16} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Text style={{ fontSize: 9, letterSpacing: 1, fontWeight: "700", color: tone.fg }}>
            {tone.label}
          </Text>
          <Text style={{ fontSize: 10.5, color: palette.ink4 }}>•</Text>
          <Text style={{ fontSize: 11, color: palette.ink3 }}>
            {relativeTime(row.created_at)}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: unread ? "600" : "500",
            color: unread ? palette.ink1 : palette.ink2,
          }}
        >
          {title}
        </Text>
        {body ? (
          <Text style={{ fontSize: 12, color: unread ? palette.ink2 : palette.ink3, marginTop: 3 }}>
            {body}
          </Text>
        ) : null}
      </View>
      {unread && !isUrgent ? (
        <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.brand, marginTop: 12 }} />
      ) : (
        <View style={{ marginTop: 12 }}>
          <I.chevR color={isUrgent && unread ? tone.fg : palette.ink4} />
        </View>
      )}
    </Pressable>
  );
}
