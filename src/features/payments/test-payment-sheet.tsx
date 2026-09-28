import { ShieldCheck } from "lucide-react-native";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Text } from "@/components/ui/text";
import type { PaymentOrder } from "@/lib/api-types";
import { rupees } from "@/lib/format";
import { berry, colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

type Props = { order: PaymentOrder; onDone: (paid: boolean) => void };

/**
 * Stands in for Razorpay while the server has no Razorpay keys (local testing).
 * "Pay" asks the server to mark the order paid, exactly as Razorpay would.
 */
export function TestPaymentSheet({ order, onDone }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => onDone(false)}>
      <View className="flex-1 justify-end" style={{ backgroundColor: berry(0.45) }}>
        <Pressable accessibilityLabel="Close payment" className="flex-1" onPress={() => onDone(false)} />
        <View
          className="w-full max-w-[32.5rem] self-center rounded-t-[1.75rem] bg-background px-6 pt-6"
          style={[shadows.luxury, { paddingBottom: Math.max(sz(24), insets.bottom + sz(12)) }]}
        >
          <View className="flex-row items-center justify-between">
            <Eyebrow>TEST PAYMENT</Eyebrow>
            <View className="flex-row items-center gap-1 rounded-full bg-accent px-3 py-1">
              <ShieldCheck size={sz(12)} color={colors.primary} />
              <Text className="font-bold text-[0.625rem] leading-[0.9375rem] text-accent-foreground">NO REAL MONEY</Text>
            </View>
          </View>
          <Text className="mt-3 font-display text-4xl leading-[2.75rem]">{rupees(order.amountPaise)}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">{order.description}</Text>
          <Text className="mt-4 rounded-2xl bg-nude p-4 text-xs leading-[1.1875rem] text-muted-foreground">
            This server is in test mode. Paying here confirms the booking the same way Razorpay will once payment keys are added.
          </Text>
          <Button size="lg" variant="luxury" className="mt-5 w-full" onPress={() => onDone(true)}>
            {`Pay ${rupees(order.amountPaise)}`}
          </Button>
          <Button variant="ghost" className="mt-1" onPress={() => onDone(false)}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );
}
