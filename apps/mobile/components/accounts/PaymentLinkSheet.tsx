import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTheme } from "../../lib/theme";
import {
  usePaymentLinkDraft,
  type DraftAccount,
  type DraftCard,
} from "./wizard/usePaymentLinkDraft";
import { Step0CardPicker } from "./wizard/Step0CardPicker";
import { Step1Funders } from "./wizard/Step1Funders";
import { Step2Split } from "./wizard/Step2Split";
import { Step3Scope } from "./wizard/Step3Scope";

interface Props {
  visible: boolean;
  cards: DraftCard[];
  funders: DraftAccount[];
  spaceName: string;
  /** Pre-select a card when entering the wizard (e.g. tapping "Set up funding" on a credit card row). */
  initialCardId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PaymentLinkSheet({
  visible,
  cards,
  funders,
  spaceName,
  initialCardId,
  onClose,
  onSaved,
}: Props) {
  const { palette } = useTheme();
  const draft = usePaymentLinkDraft({ cards, funders });
  const [step, setStep] = useState(1);

  // The wizard has 4 logical steps. When there is exactly one card we skip the
  // picker and present 3 steps to the user.
  const skipPicker = cards.length === 1;
  const totalShown = skipPicker ? 3 : 4;

  useEffect(() => {
    if (!visible) return;
    draft.reset();
    if (initialCardId) {
      const c = cards.find((x) => x.id === initialCardId);
      if (c) {
        draft.setCard(c);
        setStep(skipPicker ? 1 : 2);
        return;
      }
    }
    setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCardId]);

  function close() {
    onClose();
  }

  async function handleSave() {
    const ok = await draft.commit();
    if (ok) {
      onSaved();
      onClose();
    }
  }

  // Map logical wizard step to the StepShell's "step of total" indicator.
  const visibleStep = skipPicker ? step : step;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            height: "92%",
            backgroundColor: palette.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          {!skipPicker && step === 1 ? (
            <Step0CardPicker
              cards={cards}
              selectedId={draft.state.card?.id ?? null}
              onSelect={(c) => draft.setCard(c)}
              onContinue={() => setStep(2)}
              onClose={close}
            />
          ) : null}

          {((!skipPicker && step === 2) || (skipPicker && step === 1)) &&
          draft.state.card ? (
            <Step1Funders
              card={draft.state.card}
              funders={funders}
              selectedIds={draft.state.funderIds}
              onToggle={draft.toggleFunder}
              onContinue={() => setStep(skipPicker ? 2 : 3)}
              onBack={() => setStep(skipPicker ? 1 : 1)}
              onClose={close}
              step={skipPicker ? 1 : 2}
              total={totalShown}
            />
          ) : null}

          {((!skipPicker && step === 3) || (skipPicker && step === 2)) &&
          draft.state.card ? (
            <Step2Split
              card={draft.state.card}
              funders={funders.filter((f) => draft.state.funderIds.includes(f.id))}
              splits={draft.state.splits}
              onSetSplit={draft.setSplit}
              onEvenSplit={draft.evenSplitNow}
              onContinue={() => setStep(skipPicker ? 3 : 4)}
              onBack={() => setStep(skipPicker ? 1 : 2)}
              onClose={close}
              step={skipPicker ? 2 : 3}
              total={totalShown}
            />
          ) : null}

          {((!skipPicker && step === 4) || (skipPicker && step === 3)) &&
          draft.state.card ? (
            <Step3Scope
              card={draft.state.card}
              scope={draft.state.scope}
              onSetScope={draft.setScope}
              onSave={handleSave}
              onBack={() => setStep(skipPicker ? 2 : 3)}
              onClose={close}
              spaceName={spaceName}
              saving={draft.committing}
              error={draft.error}
              step={skipPicker ? 3 : 4}
              total={totalShown}
            />
          ) : null}

          {/* Fallback when picker is required but not yet picked. */}
          {!skipPicker && step !== 1 && !draft.state.card ? (
            <View />
          ) : null}

          {/* Suppress unused variable */}
          <View style={{ position: "absolute", opacity: 0 }} accessible={false}>
            <View accessible={false} testID={`step-${visibleStep}`} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
