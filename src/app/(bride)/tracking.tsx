import { useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Check, Clock3, MapPin, Phone, Star, UserRound, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { GentleIn } from "@/components/ui/motion";
import { ErrorState, LoadingState, messageOf } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { statusLabel } from "@/features/booking/status";
import { useCheckout } from "@/features/payments/use-checkout";
import { api } from "@/lib/api";
import type { BookingDetail, CancelResult } from "@/lib/api-types";
import { clockTime, longDate, rupees } from "@/lib/format";
import { hapticImpact, hapticSuccess } from "@/lib/haptics";
import { keys, useBooking, useRefreshOnFocus } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

const back = () => {
  router.dismissAll();
  router.navigate("/bookings");
};

/** Booking status: the live timeline, what is paid and what the bride can do next. */
export default function Tracking() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const booking = useBooking(id);
  const headerHeight = useHeaderHeight();
  useRefreshOnFocus(booking.refetch, !!id);
  if (!id) return <Redirect href="/bookings" />;

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      {booking.isPending ? (
        <LoadingState className="flex-1" />
      ) : booking.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
        </View>
      ) : (
        <BookingStatus booking={booking.data} headerHeight={headerHeight} />
      )}
      <Header title="Booking status" onBack={back} />
    </View>
  );
}

function BookingStatus({ booking, headerHeight }: { booking: BookingDetail; headerHeight: number }) {
  const client = useQueryClient();
  const checkout = useCheckout();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("Change of plans");

  const ended = booking.status === "cancelled" || booking.status === "expired";
  const artistName = booking.artist?.studioName ?? "Your artist";
  const details: [LucideIcon, string][] = [
    [UserRound, artistName],
    [CalendarDays, longDate(booking.startsAt)],
    [Clock3, clockTime(booking.startsAt)],
    [MapPin, booking.venue],
    ...(booking.artist?.phone ? ([[Phone, booking.artist.phone]] as [LucideIcon, string][]) : []),
  ];

  /** Runs one action, keeping this screen and the booking lists in step with the server. */
  const run: Run = async (action) => {
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await action();
      if (outcome) {
        client.setQueryData(keys.booking(outcome.booking.id), outcome.booking);
        void client.invalidateQueries({ queryKey: ["me", "bookings"] });
        hapticSuccess();
        setMessage(outcome.message);
      }
    } catch (error) {
      hapticImpact();
      setMessage(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const pay = () =>
    run(async () => {
      const paid = await checkout.pay(booking.id, booking.canPay ?? "advance");
      if (!paid) return null; // checkout closed without paying
      const lost = paid.status === "cancelled";
      return {
        booking: paid,
        message: lost ? "That time was taken before your payment arrived, so it is being refunded in full." : "Payment received. Thank you!",
      };
    });

  const cancel = () =>
    run(async () => {
      const result = await api<CancelResult>(`/v1/bookings/${booking.id}/cancel`, { body: { reason: reason.trim() } });
      setCancelling(false);
      const message =
        result.refundPaise > 0
          ? `Cancelled. ${rupees(result.refundPaise)} will be refunded to your original payment method.`
          : booking.paidPaise > 0
            ? "Cancelled. Bookings cancelled this close to the day are not refunded."
            : "Cancelled.";
      return { booking: result.booking, message };
    });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(40) }}>
      <View className="px-5 py-7">
        <GentleIn>
          <View className="rounded-2xl bg-card p-4" style={shadows.sm}>
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.1125rem] text-primary">
                {longDate(booking.startsAt).toUpperCase()} · {clockTime(booking.startsAt)}
              </Text>
              <View className={cn("rounded-full px-3 py-1", ended ? "bg-muted" : "bg-accent")}>
                <Text className={cn("font-bold text-[0.5625rem] leading-[0.8438rem]", ended ? "text-muted-foreground" : "text-accent-foreground")}>
                  {statusLabel(booking.status)}
                </Text>
              </View>
            </View>
            <Text className="mt-2 font-display text-3xl leading-9">{booking.title}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {artistName}
              {booking.artist ? ` · ${booking.artist.city}` : ""} · {booking.ref}
            </Text>
          </View>
        </GentleIn>

        {message ? <Text className="mt-5 rounded-2xl bg-accent p-4 text-sm leading-5 text-accent-foreground">{message}</Text> : null}

        {booking.canPay === "advance" ? (
          <GentleIn delay={80}>
            <View className="mt-5 rounded-2xl border border-primary/30 bg-card p-5" style={shadows.sm}>
              <Text className="font-display text-xl leading-7">Awaiting payment</Text>
              <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                Your time is held until {clockTime(booking.holdExpiresAt ?? booking.startsAt)}. Pay the advance to confirm it.
              </Text>
              <Button size="lg" variant="luxury" className="mt-4 w-full" disabled={busy} onPress={() => void pay()}>
                {`Pay ${rupees(booking.advancePaise)}`}
              </Button>
            </View>
          </GentleIn>
        ) : null}

        {ended ? (
          <View className="mt-7 rounded-2xl bg-muted p-5">
            <Text className="font-display text-xl leading-7">{booking.status === "expired" ? "This hold ran out" : "This booking was cancelled"}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {booking.status === "expired" ? "The advance was not paid in time, so the slot was released." : (booking.cancelReason ?? "")}
            </Text>
          </View>
        ) : (
          <View className="mt-9">
            {booking.timeline.map((s, i) => (
              <GentleIn key={s.key} delay={120 + i * 90} style={{ flexDirection: "row", gap: sz(16) }}>
                <View className="w-7 items-center">
                  <View
                    className={cn(
                      "h-7 w-7 items-center justify-center rounded-full border",
                      s.done ? "border-primary bg-primary" : "border-border bg-background",
                    )}
                  >
                    {s.done ? <Check size={sz(12)} color={colors.primaryForeground} /> : <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                  </View>
                  {i < booking.timeline.length - 1 ? <View className={cn("h-16 w-px", s.done ? "bg-primary" : "bg-border")} /> : null}
                </View>
                <View className="flex-1 pt-1">
                  <Text className="font-bold text-sm uppercase leading-5 tracking-[0.0875rem]">{s.label}</Text>
                  {s.key === "assigned" && s.done ? (
                    <Text className="mt-1 text-xs leading-4 text-muted-foreground">{artistName} has been assigned</Text>
                  ) : s.at ? (
                    <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                      {longDate(s.at)} · {clockTime(s.at)}
                    </Text>
                  ) : null}
                </View>
              </GentleIn>
            ))}
          </View>
        )}

        <GentleIn delay={600}>
          <View className="mt-7 rounded-2xl bg-nude p-5">
            <Text className="font-display text-xl leading-7">Appointment details</Text>
            <View className="mt-4 gap-3">
              {details.map(([Icon, value]) => (
                <View key={value} className="flex-row items-center">
                  <Icon size={sz(16)} color={colors.foreground} />
                  <Text className="ml-2 flex-1 text-sm leading-5">{value}</Text>
                </View>
              ))}
            </View>
            <View className="mt-5 gap-1 border-t border-border pt-4">
              <Amount label="Total" value={booking.totalPaise} />
              <Amount label="Paid" value={booking.paidPaise} />
              {booking.balancePaise > 0 && !ended ? <Amount label="Balance due" value={booking.balancePaise} /> : null}
              {booking.refundedPaise > 0 ? <Amount label="Refunded" value={booking.refundedPaise} /> : null}
            </View>
          </View>

          {booking.canPay === "balance" ? (
            <Button size="lg" className="mt-5 w-full" disabled={busy} onPress={() => void pay()}>
              {`Pay balance ${rupees(booking.balancePaise)}`}
            </Button>
          ) : null}

          {booking.canReview ? <ReviewCard booking={booking} busy={busy} run={run} /> : null}
          {booking.review ? (
            <View className="mt-5 rounded-2xl bg-card p-5" style={shadows.sm}>
              <Text className="text-base leading-6 tracking-[0.125rem] text-primary">{"★".repeat(booking.review.rating)}</Text>
              {booking.review.comment ? <Text className="mt-2 font-display text-lg leading-7">“{booking.review.comment}”</Text> : null}
              <Text className="mt-2 text-xs leading-4 text-muted-foreground">Your review · thank you</Text>
            </View>
          ) : null}

          {booking.canCancel ? (
            cancelling ? (
              <View className="mt-5 rounded-2xl border border-border bg-card p-5">
                <Text className="font-display text-lg leading-7">Cancel this booking?</Text>
                <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                  Cancelling well ahead of the day refunds what you paid. Tell us briefly why:
                </Text>
                <Input
                  accessibilityLabel="Reason for cancelling"
                  value={reason}
                  onChangeText={setReason}
                  maxLength={300}
                  className="mt-3 h-12 rounded-2xl bg-background px-4"
                />
                <View className="mt-4 flex-row gap-2">
                  <Button variant="outline" className="h-11 flex-1 rounded-full" onPress={() => setCancelling(false)}>
                    Keep booking
                  </Button>
                  <Button className="h-11 flex-1 rounded-full" disabled={busy || reason.trim().length < 3} onPress={() => void cancel()}>
                    Yes, cancel
                  </Button>
                </View>
              </View>
            ) : (
              <Button variant="ghost" className="mt-4" textClassName="text-muted-foreground" onPress={() => setCancelling(true)}>
                Cancel booking
              </Button>
            )
          ) : null}
        </GentleIn>
      </View>
      {checkout.sheet}
    </ScrollView>
  );
}

function Amount({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm leading-5 text-muted-foreground">{label}</Text>
      <Text className="font-semibold text-sm leading-5">{rupees(value)}</Text>
    </View>
  );
}

/** An action on the booking: resolves with the updated booking and what to tell the bride, or null if nothing happened. */
type Run = (action: () => Promise<{ booking: BookingDetail; message: string | null } | null>) => Promise<void>;

/** After a completed booking: stars and a few words, shown on the artist's page. */
function ReviewCard({ booking, busy, run }: { booking: BookingDetail; busy: boolean; run: Run }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = () =>
    run(async () => {
      await api(`/v1/bookings/${booking.id}/review`, { body: { rating, comment: comment.trim() || undefined } });
      return { booking: await api<BookingDetail>(`/v1/bookings/${booking.id}`), message: "Thank you for your review!" };
    });

  return (
    <View className="mt-5 rounded-2xl bg-card p-5" style={shadows.sm}>
      <Text className="font-display text-xl leading-7">How was your day?</Text>
      <View className="mt-3 flex-row gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} stars`} hitSlop={6}>
            <Star size={sz(28)} color={colors.primary} fill={n <= rating ? colors.primary : "none"} />
          </Pressable>
        ))}
      </View>
      <Textarea
        accessibilityLabel="Your review"
        placeholder={`A few words about ${booking.artist?.studioName ?? "your artist"} (optional)`}
        value={comment}
        onChangeText={setComment}
        maxLength={1000}
        className="mt-4 min-h-24 rounded-2xl bg-background p-4"
      />
      <Button size="lg" className="mt-4 w-full" disabled={busy} onPress={() => void submit()}>
        Share review
      </Button>
    </View>
  );
}
