import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowRight, ChevronLeft, ChevronRight, Minus, PackagePlus, Plus, Sparkles } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { GlassSurface } from "@/components/layout/glass-surface";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Textarea } from "@/components/ui/input";
import { GentleIn } from "@/components/ui/motion";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useAuth } from "@/features/auth/auth-provider";
import { showServerError } from "@/features/auth/server-errors";
import { DateFace, Progress, SlotFace } from "@/features/booking/components/booking-parts";
import { bookingDetailsSchema, type BookingDetailsInput } from "@/features/booking/schemas";
import { useCheckout } from "@/features/payments/use-checkout";
import { askToSignIn } from "@/features/saved/use-saved";
import { useScreen } from "@/hooks/use-screen";
import { api, ApiError } from "@/lib/api";
import type { ArtistDetail, BookingDetail, MenuItem } from "@/lib/api-types";
import { clockTime, dayLabel, duration, rupees, shiftDate, todayInIndia } from "@/lib/format";
import { hapticImpact, hapticSuccess, hapticTap } from "@/lib/haptics";
import { newAttemptId, useArtist, useCalendar, useSlots } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { shadows } from "@/theme";
import { sz } from "@/theme/scale";

const WINDOW_DAYS = 14;
const FIELDS = ["contactName", "contactPhone", "eventType", "venue", "notes"] as const;

/** "Book your moment": service & extras → date & time → details → pay the advance. */
export default function Book() {
  const params = useLocalSearchParams<{ artist?: string; offering?: string }>();
  const artist = useArtist(params.artist);
  const main = artist.data?.services.find((s) => s.artistServiceId === params.offering) ?? artist.data?.services[0];

  if (!artist.data || !main) {
    return (
      <View className="flex-1 justify-center bg-background">
        <FocusStatusBar style="dark" />
        {artist.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState
            error={artist.error ?? new ApiError(404, "NO_SERVICES", "This artist has no services to book right now.")}
            onRetry={() => void artist.refetch()}
          />
        )}
        <Header title="Book your moment" onBack={() => router.back()} />
      </View>
    );
  }
  return <BookFlow artist={artist.data} main={main} />;
}

function BookFlow({ artist, main }: { artist: ArtistDetail; main: MenuItem }) {
  const { user } = useAuth();
  const checkout = useCheckout();

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width } = useScreen();
  const slotW = (width - sz(52)) / 2;
  const scroller = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"addons" | "package">("addons");
  const [extras, setExtras] = useState<string[]>([]);
  const [windowStart, setWindowStart] = useState(todayInIndia);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [held, setHeld] = useState<BookingDetail | null>(null);
  const [busy, setBusy] = useState(false);
  // One id per booking attempt; reused if the same attempt is retried (see newAttemptId).
  const attempt = useRef<{ key: string; id: string } | null>(null);

  // Step one: the main service plus any extras from the same artist.
  const addOns = artist.services.filter((s) => s.artistServiceId !== main.artistServiceId);
  const chosen = addOns.filter((s) => extras.includes(s.artistServiceId));
  const items = [main, ...chosen];
  const ids = items.map((s) => s.artistServiceId);
  const totalPaise = items.reduce((sum, s) => sum + s.pricePaise, 0);
  const minutes = items.reduce((sum, s) => sum + s.durationMinutes, 0);
  const label = mode === "package" && chosen.length ? "Custom bridal package" : main.name;

  // Step two: free days and times, fresh from the server for exactly these services.
  const calendar = useCalendar(artist.id, ids, windowStart, WINDOW_DAYS);
  const days = calendar.data?.days ?? [];
  const firstFree = days.find((d) => d.available)?.date ?? null;
  const selectedDate = date && days.some((d) => d.date === date && d.available) ? date : firstFree;
  const slots = useSlots(artist.id, ids, step >= 2 ? selectedDate : null);
  const selectedSlot = slots.data?.slots.find((s) => s.startsAt === slot && s.available) ?? null;

  const form = useForm<BookingDetailsInput>({
    resolver: zodResolver(bookingDetailsSchema),
    defaultValues: {
      contactName: user?.fullName ?? "",
      contactPhone: user?.phone.replace(/^\+91/, "") ?? "",
      eventType: "Wedding",
      venue: "",
      notes: "",
    },
    mode: "onTouched",
  });

  const goTo = (n: number) => {
    setStep(n);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };
  const back = () => (step > 1 ? goTo(step - 1) : router.back());

  // Android's back button steps back through the form before leaving it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step > 1) {
          setStep(step - 1);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step]),
  );

  const toggleExtra = (id: string) => {
    hapticTap();
    setHeld(null);
    setExtras((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  /** Back to the date step with a message, after the chosen time was lost. */
  const chooseAgain = (message: string) => {
    attempt.current = null;
    setHeld(null);
    setSlot(null);
    setNotice(message);
    goTo(2);
    void calendar.refetch();
    void slots.refetch();
  };

  /** Books the chosen time and opens payment. Runs once the details form is valid. */
  const book = async (values: BookingDetailsInput) => {
    if (!selectedSlot) return goTo(2);
    setFormError(null);
    setBusy(true);
    try {
      const body = {
        artistId: artist.id,
        artistServiceIds: ids,
        startsAt: selectedSlot.startsAt,
        eventType: values.eventType,
        venue: values.venue,
        contactName: values.contactName,
        contactPhone: values.contactPhone,
        notes: values.notes || undefined,
      };
      // The same booking sent again (a retry after closing checkout, or a
      // dropped connection) keeps its id, so the server returns the same booking.
      const key = JSON.stringify(body);
      if (attempt.current?.key !== key) attempt.current = { key, id: newAttemptId() };
      const booking = await api<BookingDetail>("/v1/bookings", { body: { ...body, idempotencyKey: attempt.current.id } });
      setHeld(booking);

      const paid = await checkout.pay(booking.id, "advance");
      if (!paid) return; // checkout closed: the time stays held, and "Pay" tries again
      if (paid.status === "confirmed") {
        hapticSuccess();
        router.dismissAll();
        router.push({ pathname: "/confirmation", params: { id: paid.id } });
        return;
      }
      chooseAgain("That time was taken just before your payment arrived, so it is being refunded in full. Please choose another time.");
    } catch (error) {
      hapticImpact();
      if (error instanceof ApiError && ["SLOT_TAKEN", "HOLD_EXPIRED", "TOO_SOON", "OUTSIDE_HOURS"].includes(error.code)) {
        chooseAgain(error.message);
        return;
      }
      setFormError(showServerError(error, FIELDS, form.setError));
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 1) return goTo(2);
    if (step === 2) {
      setNotice(null);
      return goTo(3);
    }
    if (!user) return askToSignIn();
    void form.handleSubmit(book, () => hapticImpact())();
  };

  const cta = step < 3 ? "Continue" : !user ? "Sign in to book" : held ? `Pay ${rupees(held.advancePaise)} to confirm` : "Confirm & pay advance";

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scroller}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) + insets.bottom }}
          >
            <Progress step={step} />

            <GentleIn key={step} style={{ paddingHorizontal: sz(20), paddingVertical: sz(32) }}>
              {step === 1 ? (
                <>
                  <Eyebrow>STEP ONE</Eyebrow>
                  <Text className="mt-2 font-display text-4xl leading-10">Make it yours.</Text>

                  <View className="mt-6 flex-row gap-4 rounded-2xl bg-card p-3" style={shadows.sm}>
                    <Image source={pictureOf(main.imageUrl, main.serviceId)} contentFit="cover" style={{ width: sz(90), height: sz(112), borderRadius: sz(25.6) }} />
                    <View className="flex-1 py-2">
                      <Text className="font-display text-xl leading-7">{main.name}</Text>
                      <Text className="mt-2 text-xs leading-4 text-muted-foreground">with {artist.studioName}</Text>
                      <Text className="mt-4 font-semibold text-base leading-6">{rupees(main.pricePaise)}</Text>
                    </View>
                  </View>

                  {addOns.length ? (
                    <>
                      <View className="mt-7 flex-row rounded-2xl bg-muted p-1">
                        <Button
                          variant={mode === "addons" ? "default" : "ghost"}
                          className="flex-1 rounded-xl"
                          iconLeft={Sparkles}
                          onPress={() => {
                            setMode("addons");
                            setExtras([]);
                          }}
                        >
                          Add-ons
                        </Button>
                        <Button variant={mode === "package" ? "default" : "ghost"} className="flex-1 rounded-xl" iconLeft={PackagePlus} onPress={() => setMode("package")}>
                          Create package
                        </Button>
                      </View>

                      <View className="mt-6">
                        <Text className="font-display text-2xl leading-8">{mode === "addons" ? "Add finishing touches" : "Build your package"}</Text>
                        <Text className="mt-1 text-xs leading-[1.2188rem] text-muted-foreground">
                          {mode === "addons" ? "Choose any extras you’d like with this service." : "Combine services for a celebration planned your way."}
                        </Text>
                        <View className="mt-4 gap-2">
                          {addOns.map((item) => {
                            const on = extras.includes(item.artistServiceId);
                            return (
                              <View
                                key={item.artistServiceId}
                                className={cn("flex-row items-center gap-3 rounded-2xl border p-4", on ? "border-primary bg-accent" : "border-border bg-card")}
                              >
                                <View className="flex-1">
                                  <Text className="font-bold text-sm leading-5">{item.name}</Text>
                                  <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                                    {duration(item.durationMinutes)} · {rupees(item.pricePaise)}
                                  </Text>
                                </View>
                                <Button
                                  size="icon"
                                  variant={on ? "default" : "outline"}
                                  accessibilityLabel={on ? `Remove ${item.name}` : `Add ${item.name}`}
                                  onPress={() => toggleExtra(item.artistServiceId)}
                                  iconLeft={on ? Minus : Plus}
                                />
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  ) : null}

                  <View className="mt-6 flex-row items-end justify-between rounded-2xl bg-nude p-4">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs leading-4 text-muted-foreground">
                        {items.length} {items.length === 1 ? "service" : "services"} · {duration(minutes)}
                      </Text>
                      <Text className="font-display text-xl leading-7">{label}</Text>
                    </View>
                    <Text className="font-bold text-lg leading-7">{rupees(totalPaise)}</Text>
                  </View>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <Eyebrow>{dayLabel(selectedDate ?? windowStart).month}</Eyebrow>
                    <View className="flex-row gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        accessibilityLabel="Earlier dates"
                        disabled={windowStart <= todayInIndia()}
                        iconLeft={ChevronLeft}
                        onPress={() => {
                          setDate(null);
                          setWindowStart((start) => shiftDate(start, -WINDOW_DAYS));
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        accessibilityLabel="Later dates"
                        iconLeft={ChevronRight}
                        onPress={() => {
                          setDate(null);
                          setWindowStart((start) => shiftDate(start, WINDOW_DAYS));
                        }}
                      />
                    </View>
                  </View>
                  <Text className="mt-2 font-display text-4xl leading-10">Choose a date.</Text>
                  {notice ? <Text className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-5 text-accent-foreground">{notice}</Text> : null}

                  {calendar.isPending ? (
                    <LoadingState className="py-12" />
                  ) : calendar.isError ? (
                    <ErrorState error={calendar.error} onRetry={() => void calendar.refetch()} className="py-12" />
                  ) : (
                    <>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-6" contentContainerClassName="gap-2 px-5">
                        {days.map((d) => {
                          const face = dayLabel(d.date);
                          return (
                            <Button
                              key={d.date}
                              variant={selectedDate === d.date ? "default" : "outline"}
                              disabled={!d.available}
                              className="h-20 w-16 flex-col rounded-2xl px-0"
                              accessibilityLabel={`${face.full}, ${d.available ? "available" : "fully booked"}`}
                              onPress={() => {
                                hapticTap();
                                setHeld(null);
                                setDate(d.date);
                                setSlot(null);
                              }}
                            >
                              <DateFace dow={face.dow} day={face.day} />
                            </Button>
                          );
                        })}
                      </ScrollView>

                      <Text className="mt-9 font-display text-2xl leading-8">Available times</Text>
                      <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                        {selectedDate ? `${dayLabel(selectedDate).full} · ${duration(minutes)} · Indian time` : "No free days in these two weeks — try later dates."}
                      </Text>
                      {slots.isFetching && !slots.data ? (
                        <LoadingState className="py-10" />
                      ) : slots.isError ? (
                        <ErrorState error={slots.error} onRetry={() => void slots.refetch()} className="py-10" />
                      ) : (
                        <View className="mt-4 flex-row flex-wrap gap-3">
                          {(slots.data?.slots ?? []).map((s) => (
                            <Button
                              key={s.startsAt}
                              variant={selectedSlot?.startsAt === s.startsAt ? "default" : "outline"}
                              disabled={!s.available}
                              className="h-14 flex-col gap-0 rounded-2xl"
                              style={{ width: slotW }}
                              accessibilityLabel={`${s.label}, ${s.available ? "available" : "booked"}`}
                              onPress={() => {
                                hapticTap();
                                setHeld(null);
                                setSlot(s.startsAt);
                              }}
                            >
                              <SlotFace time={s.label} available={s.available} />
                            </Button>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Eyebrow>STEP THREE</Eyebrow>
                  <Text className="mt-2 font-display text-4xl leading-10">A few details.</Text>
                  <View className="mt-6 gap-3">
                    <Field control={form.control} name="contactName" label="Name" autoComplete="name" />
                    <Field control={form.control} name="contactPhone" label="Phone" keyboardType="phone-pad" maxLength={10} digitsOnly />
                    <Field control={form.control} name="eventType" label="Event type" />
                    <Field control={form.control} name="venue" label="Venue" />
                    <Field control={form.control} name="notes" label="Additional notes (optional)" multiline />
                  </View>
                  <View className="mt-6 rounded-2xl bg-nude p-4">
                    <Text className="font-display text-lg leading-7">Your booking</Text>
                    <Text className="mt-2 text-sm leading-5 text-muted-foreground">
                      {items.map((s) => s.name).join(" + ")}
                      {"\n"}
                      {selectedDate ? dayLabel(selectedDate).full : ""} · {selectedSlot ? clockTime(selectedSlot.startsAt) : ""} · {artist.studioName}
                    </Text>
                    <Text className="mt-3 font-semibold text-sm leading-5">Total · {rupees(totalPaise)}</Text>
                    <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                      {held
                        ? `Your time is held until ${clockTime(held.holdExpiresAt ?? held.startsAt)}. Pay the ${rupees(held.advancePaise)} advance to confirm it.`
                        : "You pay a small advance now to confirm; the rest is paid later."}
                    </Text>
                  </View>
                  {formError ? <Text className="mt-4 text-sm leading-5 text-[#C0392B]">{formError}</Text> : null}
                </>
              ) : null}
            </GentleIn>
          </ScrollView>
        </View>

        <GlassSurface className="border-t border-border px-3 pt-3" style={{ paddingBottom: Math.max(sz(16), insets.bottom) }}>
          <Button
            size="lg"
            className="w-full max-w-[25rem] self-center"
            disabled={(step === 2 && !selectedSlot) || busy}
            iconRight={ArrowRight}
            onPress={next}
          >
            {busy ? "Please wait…" : cta}
          </Button>
        </GlassSurface>
      </KeyboardAvoidingView>

      <Header title="Book your moment" onBack={back} />
      {checkout.sheet}
    </View>
  );
}

type FieldProps = {
  control: Control<BookingDetailsInput>;
  name: (typeof FIELDS)[number];
  label: string;
  multiline?: boolean;
  digitsOnly?: boolean;
  keyboardType?: "phone-pad";
  maxLength?: number;
  autoComplete?: "name";
};

/** One labelled input of the details form, with its error underneath. */
function Field({ control, name, label, multiline, digitsOnly, keyboardType, maxLength, autoComplete }: FieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const Box = multiline ? Textarea : Input;
        return (
          <View>
            <Box
              accessibilityLabel={label}
              placeholder={label}
              value={value}
              onChangeText={(text) => onChange(digitsOnly ? text.replace(/\D/g, "") : text)}
              onBlur={onBlur}
              keyboardType={keyboardType}
              maxLength={maxLength}
              autoComplete={autoComplete}
              className={multiline ? "min-h-24 rounded-2xl bg-card p-4" : "h-14 rounded-2xl bg-card px-4"}
            />
            {error?.message ? <Text className="ml-1 mt-1 text-xs leading-4 text-[#C0392B]">{error.message}</Text> : null}
          </View>
        );
      }}
    />
  );
}
