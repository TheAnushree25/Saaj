import { useRef } from "react";
import { ActivityIndicator, Linking, Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { PaymentOrder } from "@/lib/api-types";
import { colors } from "@/theme";
import { checkoutOptions, type RazorpayProof } from "./razorpay-options";

type Props = { order: PaymentOrder; onDone: (proof: RazorpayProof | null) => void };

type Message =
  | ({ type: "success" } & RazorpayProof)
  | { type: "dismiss" }
  | { type: "error"; message?: string };

/**
 * Razorpay's standard checkout, on phones. It is a web page, so it runs in a
 * WebView; this works in Expo Go and in built apps alike, with no native SDK.
 * The page reports back through postMessage: paid (with the proof the server
 * checks) or closed.
 */
export function RazorpayCheckout({ order, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const finished = useRef(false);

  const finish = (proof: RazorpayProof | null) => {
    if (finished.current) return;
    finished.current = true;
    onDone(proof);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    let message: Message;
    try {
      message = JSON.parse(event.nativeEvent.data) as Message;
    } catch {
      return;
    }
    if (message.type === "success") {
      finish({
        razorpayOrderId: message.razorpayOrderId,
        razorpayPaymentId: message.razorpayPaymentId,
        razorpaySignature: message.razorpaySignature,
      });
    } else {
      finish(null);
    }
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => finish(null)}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <WebView
          source={{ html: checkoutPage(order), baseUrl: "https://checkout.razorpay.com" }}
          originWhitelist={["*"]}
          onMessage={onMessage}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-background">
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          // UPI apps open through links like upi://pay?... that a WebView cannot
          // load itself: hand those to the phone, which opens GPay, PhonePe etc.
          onShouldStartLoadWithRequest={(request) => {
            if (/^(https?|about|data|blob):/i.test(request.url)) return true;
            Linking.openURL(request.url).catch(() => {});
            return false;
          }}
        />
      </View>
    </Modal>
  );
}

/** A tiny page that opens Razorpay's checkout and posts the result back to the app. */
function checkoutPage(order: PaymentOrder) {
  // "<" is escaped so no text in the options (a name, say) can end the script early.
  const options = JSON.stringify(checkoutOptions(order)).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:${colors.background}">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  var options = ${options};
  options.handler = function (response) {
    send({
      type: "success",
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    });
  };
  options.modal = { ondismiss: function () { send({ type: "dismiss" }); }, confirm_close: true };
  if (window.Razorpay) new window.Razorpay(options).open();
  else send({ type: "error", message: "Could not load the payment page." });
</script>
</body>
</html>`;
}
