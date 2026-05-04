import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  getAccountsForView,
  getMembersWithProfilesForSpace,
  getTransactionsForView,
  setTransactionShare,
} from "@cvc/api-client";
import { displayMerchantName } from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { TransactionEditSheet } from "../../components/TransactionEditSheet";
import { RecurringSuggestionsBanner } from "../../components/RecurringSuggestionsBanner";

interface Txn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

interface AccountOpt {
  id: string;
  name: string;
}

interface MemberOpt {
  user_id: string;
  display_name: string | null;
  invited_email: string | null;
}

type Status = "all" | "pending" | "completed";
type PickerKind = "account" | "category" | "person" | null;

export default function Transactions() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [accountOpts, setAccountOpts] = useState<AccountOpt[]>([]);
  const [memberOpts, setMemberOpts] = useState<MemberOpt[]>([]);
  const [status, setStatus] = useState<Status>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<PickerKind>(null);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [splitTxnIds, setSplitTxnIds] = useState<Set<string>>(new Set());
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      limit: 200,
      accountIds: accountIds.size ? Array.from(accountIds) : undefined,
      categories: categories.size ? Array.from(categories) : undefined,
      ownerUserIds: ownerUserIds.size ? Array.from(ownerUserIds) : undefined,
    }).then((data) => setTxns(data as unknown as Txn[]));
  }, [activeSpaceId, sharedView, accountIds, categories, ownerUserIds, reloadCount]);

  useEffect(() => {
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }).then((accs) => {
      const opts = (accs as Array<{ id: string; name: string }>).map((a) => ({
        id: a.id,
        name: a.name,
      }));
      setAccountOpts(opts);
    });
  }, [activeSpaceId, sharedView]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setMemberOpts([]);
      return;
    }
    getMembersWithProfilesForSpace(supabase, activeSpaceId).then((rows) => {
      setMemberOpts(rows as MemberOpt[]);
    });
  }, [activeSpaceId, sharedView]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setHiddenIds(new Set());
      return;
    }
    supabase
      .from("transaction_shares")
      .select("transaction_id")
      .eq("space_id", activeSpaceId)
      .eq("hidden", true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [activeSpaceId, sharedView, reloadCount]);

  useEffect(() => {
    if (txns.length === 0) {
      setSplitTxnIds(new Set());
      return;
    }
    const ids = txns.map((t) => t.id);
    supabase
      .from("transaction_splits")
      .select("transaction_id")
      .in("transaction_id", ids)
      .then(({ data }) => {
        const set = new Set<string>(
          (data ?? []).map((r: { transaction_id: string }) => r.transaction_id),
        );
        setSplitTxnIds(set);
      });
  }, [txns]);

  const categoryOpts = useMemo(() => {
    const set = new Set<string>();
    for (const t of txns) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (status === "pending" && !t.pending) return false;
      if (status === "completed" && t.pending) return false;
      if (recurringOnly && !t.is_recurring) return false;
      if (search && !displayMerchantName(t).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txns, status, recurringOnly, search]);

  async function hideFromSpace(txnId: string) {
    if (!activeSpaceId) return;
    await setTransactionShare(supabase, {
      transaction_id: txnId,
      space_id: activeSpaceId,
      hidden: true,
    });
    setReloadCount((c) => c + 1);
  }

  function chipLabel(prefix: string, set: Set<string>): string {
    if (set.size === 0) return prefix;
    return `${prefix} · ${set.size}`;
  }

  function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function memberLabel(m: MemberOpt): string {
    return m.display_name ?? m.invited_email ?? m.user_id.slice(0, 8);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="muted">
        {sharedView
          ? "Shared view: showing transactions visible in this space."
          : "My view: every transaction on accounts you own."}
      </Text>
      <TextInput
        placeholder="Search merchant…"
        value={search}
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: space.md,
          backgroundColor: colors.surface,
        }}
      />

      {/* Status pills + recurring toggle */}
      <HStack gap="sm" style={{ flexWrap: "wrap" }}>
        {(["all", "pending", "completed"] as Status[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: status === s ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: status === s ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: status === s ? "#fff" : colors.text }}>{s}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setRecurringOnly((v) => !v)}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.pill,
            backgroundColor: recurringOnly ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: recurringOnly ? colors.primary : colors.border,
          }}
        >
          <Text style={{ color: recurringOnly ? "#fff" : colors.text }}>recurring</Text>
        </Pressable>
      </HStack>

      {/* Multi-axis filter chips */}
      <HStack gap="sm" style={{ flexWrap: "wrap" }}>
        <FilterChip
          label={chipLabel("Account", accountIds)}
          active={accountIds.size > 0}
          onPress={() => setPicker("account")}
        />
        <FilterChip
          label={chipLabel("Category", categories)}
          active={categories.size > 0}
          onPress={() => setPicker("category")}
        />
        {sharedView ? (
          <FilterChip
            label={chipLabel("Person", ownerUserIds)}
            active={ownerUserIds.size > 0}
            onPress={() => setPicker("person")}
          />
        ) : null}
        {accountIds.size + categories.size + ownerUserIds.size > 0 ? (
          <Pressable
            onPress={() => {
              setAccountIds(new Set());
              setCategories(new Set());
              setOwnerUserIds(new Set());
            }}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="muted">Clear</Text>
          </Pressable>
        ) : null}
      </HStack>

      <RecurringSuggestionsBanner
        txns={txns}
        spaceId={activeSpaceId}
        onPromoted={() => setReloadCount((c) => c + 1)}
      />

      <Card padded={false}>
        <Stack gap="sm">
          {filtered.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setEditing(t)}
              onLongPress={() => hideFromSpace(t.id)}
            >
              <HStack
                justify="space-between"
                align="center"
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text>{displayMerchantName(t)}</Text>
                  <Text variant="muted">
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                    {t.is_recurring ? " · recurring" : ""}
                    {t.note ? " · note" : ""}
                    {splitTxnIds.has(t.id) ? " · split" : ""}
                  </Text>
                </View>
                <Money cents={t.amount} positiveColor />
              </HStack>
            </Pressable>
          ))}
          {filtered.length === 0 ? (
            <Text variant="muted" style={{ padding: space.lg }}>
              {sharedView ? "Nothing shared into this space matches your filters." : "No transactions."}
            </Text>
          ) : null}
        </Stack>
      </Card>

      {/* Picker modals */}
      <PickerModal
        visible={picker === "account"}
        title="Filter by account"
        options={accountOpts.map((a) => ({ id: a.id, label: a.name }))}
        selected={accountIds}
        onToggle={(id) => setAccountIds((s) => toggleInSet(s, id))}
        onClear={() => setAccountIds(new Set())}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === "category"}
        title="Filter by category"
        options={categoryOpts.map((c) => ({ id: c, label: c }))}
        selected={categories}
        onToggle={(id) => setCategories((s) => toggleInSet(s, id))}
        onClear={() => setCategories(new Set())}
        onClose={() => setPicker(null)}
        emptyText="Categories appear once transactions load."
      />
      <PickerModal
        visible={picker === "person"}
        title="Filter by person"
        options={memberOpts.map((m) => ({ id: m.user_id, label: memberLabel(m) }))}
        selected={ownerUserIds}
        onToggle={(id) => setOwnerUserIds((s) => toggleInSet(s, id))}
        onClear={() => setOwnerUserIds(new Set())}
        onClose={() => setPicker(null)}
      />

      <TransactionEditSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={categoryOpts}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? "#fff" : colors.text }}>{label}</Text>
    </Pressable>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  emptyText,
}: {
  visible: boolean;
  title: string;
  options: Array<{ id: string; label: string }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  emptyText?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: space.lg,
            maxHeight: "70%",
          }}
        >
          <HStack justify="space-between" align="center" style={{ marginBottom: space.md }}>
            <Text variant="title">{title}</Text>
            <Pressable onPress={onClear}>
              <Text variant="muted">Clear</Text>
            </Pressable>
          </HStack>
          <ScrollView>
            {options.length === 0 ? (
              <Text variant="muted">{emptyText ?? "No options yet."}</Text>
            ) : (
              options.map((opt) => {
                const isSel = selected.has(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => onToggle(opt.id)}
                    style={{
                      paddingVertical: space.md,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text>{opt.label}</Text>
                    <Text style={{ color: isSel ? colors.primary : colors.textMuted }}>
                      {isSel ? "✓" : ""}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: space.lg,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
