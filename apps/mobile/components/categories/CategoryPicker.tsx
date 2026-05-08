import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { fonts, I } from "@cvc/ui";
import type { Category, CategoryKind } from "@cvc/domain";
import { createCategory } from "@cvc/api-client";
import { useTheme } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import { CategoryDisc } from "./CategoryDisc";

interface Props {
  value: string | null;
  onChange: (id: string | null, category: Category | null) => void;
  categories: Category[];
  spaceId: string;
  kind?: CategoryKind;
  placeholder?: string;
  allowNone?: boolean;
  allowCreate?: boolean;
  onCategoryCreated?: (c: Category) => void;
}

export function CategoryPicker({
  value,
  onChange,
  categories,
  spaceId,
  kind,
  placeholder = "Pick a category",
  allowNone = false,
  allowCreate = false,
  onCategoryCreated,
}: Props) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => (kind ? c.kind === kind : true))
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [categories, query, kind]);

  const selected = value ? categories.find((c) => c.id === value) ?? null : null;

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createCategory(supabase, {
        space_id: spaceId,
        name,
        icon: "doc",
        color: "#7b79ae",
        kind: kind ?? "expense",
      });
      const cat = created as unknown as Category;
      onCategoryCreated?.(cat);
      onChange(cat.id, cat);
      setOpen(false);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category");
    } finally {
      setCreating(false);
    }
  }

  const exactMatch = filtered.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          paddingHorizontal: 10,
          paddingVertical: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        {selected ? (
          <>
            <CategoryDisc category={selected} size={28} />
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1, flex: 1 }}>
              {selected.name}
            </Text>
          </>
        ) : (
          <>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: palette.line,
                backgroundColor: palette.canvas,
              }}
            />
            <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: palette.ink3, flex: 1 }}>{placeholder}</Text>
          </>
        )}
        <I.chev color={palette.ink3} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: palette.canvas,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "80%",
            }}
          >
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 16, fontWeight: "500", color: palette.ink1 }}>Choose category</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={6}>
                <Text style={{ color: palette.ink2, fontSize: 14 }}>Done</Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={palette.ink4}
                style={{
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  paddingHorizontal: 12,
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  color: palette.ink1,
                }}
              />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
              {allowNone ? (
                <Pressable
                  onPress={() => {
                    onChange(null, null);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={rowStyle(value === null, palette)}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: palette.line,
                      backgroundColor: palette.canvas,
                    }}
                  />
                  <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: palette.ink2 }}>Uncategorized</Text>
                </Pressable>
              ) : null}
              {filtered.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    onChange(c.id, c);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={rowStyle(c.id === value, palette)}
                >
                  <CategoryDisc category={c} size={28} />
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1, flex: 1 }}>
                    {c.name}
                  </Text>
                  {c.kind !== "expense" ? (
                    <Text style={{ fontFamily: fonts.num, fontSize: 9.5, color: palette.ink3, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {c.kind}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
              {filtered.length === 0 && !allowCreate ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: palette.ink3, fontSize: 13 }}>No matches.</Text>
                </View>
              ) : null}
              {allowCreate && query.trim() && !exactMatch ? (
                <Pressable onPress={handleCreate} disabled={creating} style={rowStyle(false, palette)}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: palette.brand,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <I.plus color={palette.brand} size={14} />
                  </View>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.brand }}>
                    {creating ? "Creating…" : `Create "${query.trim()}"`}
                  </Text>
                </Pressable>
              ) : null}
              {error ? (
                <Text style={{ color: palette.neg, fontSize: 12, padding: 8 }}>{error}</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function rowStyle(active: boolean, palette: { canvas: string }): {
  flexDirection: "row";
  alignItems: "center";
  gap: number;
  paddingHorizontal: number;
  paddingVertical: number;
  borderRadius: number;
  backgroundColor: string;
  marginBottom: number;
} {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: active ? palette.canvas : "transparent",
    marginBottom: 2,
  };
}
