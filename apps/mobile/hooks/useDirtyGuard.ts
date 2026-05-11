import { useCallback, useEffect, useRef } from "react";
import { Alert, BackHandler } from "react-native";
import { useNavigation } from "expo-router";

// Guards against losing unsaved edits when the user navigates away.
//
// Pass an `isDirty` flag that's true whenever the form has unsaved changes.
// Returns a `confirmDiscard(then)` helper for modal Cancel / backdrop taps,
// where there's no navigation event to intercept.
//
// The hook also wires:
//   - expo-router's `beforeRemove` (back button in a PageHeader, swipe-back,
//     programmatic `router.back()`)
//   - Android hardware back button
//
// One hook, three screens (Profile rename modal, Account detail form,
// Spaces rename / color / invite modals).

interface UseDirtyGuardReturn {
  /** Wrap a Cancel / backdrop handler. Calls `then` only if the user confirms. */
  confirmDiscard: (then: () => void) => void;
}

const DISCARD_TITLE = "Discard changes?";
const DISCARD_BODY = "You have unsaved changes. They'll be lost if you leave now.";

export function useDirtyGuard(isDirty: boolean): UseDirtyGuardReturn {
  const navigation = useNavigation();
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  // Intercept stack navigation (back button in PageHeader, swipe-back, etc.)
  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      Alert.alert(DISCARD_TITLE, DISCARD_BODY, [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    });
    return sub;
  }, [navigation]);

  // Intercept Android hardware back.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!dirtyRef.current) return false;
      Alert.alert(DISCARD_TITLE, DISCARD_BODY, [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  const confirmDiscard = useCallback((then: () => void) => {
    if (!dirtyRef.current) {
      then();
      return;
    }
    Alert.alert(DISCARD_TITLE, DISCARD_BODY, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: then },
    ]);
  }, []);

  return { confirmDiscard };
}
