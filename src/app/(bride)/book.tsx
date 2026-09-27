import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ArrowRight, Minus, PackagePlus, Plus, Sparkles } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreen } from "@/hooks/use-screen";
import { GlassSurface } from "@/components/layout/glass-surface";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { DateFace, Progress, SlotFace } from "@/features/booking/components/booking-parts";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Textarea } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { inr } from "@/lib/format";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { dates, findArtist, findService, services, slots, type BookingSelection } from "@/data/catalogue";
import { useSaj } from "@/store/saj-store";
import { shadows } from "@/theme";
import { cn } from "@/lib/utils";
import { sz } from "@/theme/scale";

/** "Book your moment": service & extras → date & time → details. */
export default function Book() {
  const params = useLocalSearchParams<{ service?: string; artist?: string }>();
  const service = findService(params.service);
  const artist = findArtist(params.artist);
  const { confirmBooking } = useSaj();

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width } = useScreen();
  const slotW = (width - sz(52)) / 2;
  const scroller = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<string>(dates[0].full);
  const [time, setTime] = useState("");
  const [mode, setMode] = useState<"addons" | "package">("addons");
  const [extras, setExtras] = useState<number[]>([]);

  const addOns = services.filter((s) => s.id !== service.id).slice(0, 4);
  const chosen = addOns.filter((s) => extras.includes(s.id));
  const selection: BookingSelection = {
    label: mode === "package" && chosen.length ? "Custom bridal package" : service.name,
    items: [service.name, ...chosen.map((s) => s.name)],
    total: service.price + chosen.reduce((sum, s) => sum + s.price, 0),
  };

  const goTo = (n: number) => {
    setStep(n);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };
  const back = () => (step > 1 ? goTo(step - 1) : router.back());
  const next = () => {
    if (step < 3) return goTo(step + 1);
    hapticSuccess();
    confirmBooking({ date, time, selection, artist: artist.studio, location: artist.location });
    router.dismissAll();
    router.push("/confirmation");
  };

  // Android's back button steps back through the form before leaving it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (step > 1) {
          goTo(step - 1);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step]),
  );

  const toggleExtra = (id: number) => {
    hapticTap();
    setExtras((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

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
                    <Image source={service.image} contentFit="cover" style={{ width: sz(90), height: sz(112), borderRadius: sz(25.6) }} />
                    <View className="flex-1 py-2">
                      <Text className="font-display text-xl leading-7">{service.name}</Text>
                      <Text className="mt-2 text-xs leading-4 text-muted-foreground">with {artist.studio}</Text>
                      <Text className="mt-4 font-semibold text-base leading-6">{inr(service.price)}</Text>
                    </View>
                  </View>

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
                        const on = extras.includes(item.id);
                        return (
                          <View
                            key={item.id}
                            className={cn("flex-row items-center gap-3 rounded-2xl border p-4", on ? "border-primary bg-accent" : "border-border bg-card")}
                          >
                            <View className="flex-1">
                              <Text className="font-bold text-sm leading-5">{item.name}</Text>
                              <Text className="mt-1 text-xs leading-4 text-muted-foreground">
                                {item.duration} · {inr(item.price)}
                              </Text>
                            </View>
                            <Button
                              size="icon"
                              variant={on ? "default" : "outline"}
                              accessibilityLabel={on ? `Remove ${item.name}` : `Add ${item.name}`}
                              onPress={() => toggleExtra(item.id)}
                              iconLeft={on ? Minus : Plus}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View className="mt-6 flex-row items-end justify-between rounded-2xl bg-nude p-4">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs leading-4 text-muted-foreground">
                        {selection.items.length} {selection.items.length === 1 ? "service" : "services"}
                      </Text>
                      <Text className="font-display text-xl leading-7">{selection.label}</Text>
                    </View>
                    <Text className="font-bold text-lg leading-7">{inr(selection.total)}</Text>
                  </View>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <Eyebrow>OCTOBER 2026</Eyebrow>
                  <Text className="mt-2 font-display text-4xl leading-10">Choose a date.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-6" contentContainerClassName="gap-2 px-5">
                    {dates.map((d) => (
                      <Button
                        key={d.day}
                        variant={date === d.full ? "default" : "outline"}
                        className="h-20 w-16 flex-col rounded-2xl px-0"
                        accessibilityLabel={d.full}
                        onPress={() => {
                          hapticTap();
                          setDate(d.full);
                        }}
                      >
                        <DateFace dow={d.dow} day={d.day} />
                      </Button>
                    ))}
                  </ScrollView>

                  <Text className="mt-9 font-display text-2xl leading-8">Available times</Text>
                  <Text className="mt-1 text-xs leading-4 text-muted-foreground">Availability checked moments ago</Text>
                  <View className="mt-4 flex-row flex-wrap gap-3">
                    {slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={time === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        className="h-14 flex-col gap-0 rounded-2xl"
                        style={{ width: slotW }}
                        accessibilityLabel={`${slot.time}, ${slot.available ? "available" : "booked"}`}
                        onPress={() => {
                          hapticTap();
                          setTime(slot.time);
                        }}
                      >
                        <SlotFace time={slot.time} available={slot.available} />
                      </Button>
                    ))}
                  </View>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <Eyebrow>STEP THREE</Eyebrow>
                  <Text className="mt-2 font-display text-4xl leading-10">A few details.</Text>
                  <View className="mt-6 gap-3">
                    <Input accessibilityLabel="Name" defaultValue="Ayesha Khan" placeholder="Name" className="h-14 rounded-2xl bg-card px-4" />
                    <Input accessibilityLabel="Phone" defaultValue="+91 98765 43210" placeholder="Phone" keyboardType="phone-pad" className="h-14 rounded-2xl bg-card px-4" />
                    <Input accessibilityLabel="Event type" defaultValue="Wedding" placeholder="Event type" className="h-14 rounded-2xl bg-card px-4" />
                    <Input accessibilityLabel="Venue" defaultValue="The Oberoi Grand, Kolkata" placeholder="Venue" className="h-14 rounded-2xl bg-card px-4" />
                    <Textarea accessibilityLabel="Additional notes" placeholder="Additional notes (optional)" className="min-h-24 rounded-2xl bg-card p-4" />
                  </View>
                  <View className="mt-6 rounded-2xl bg-nude p-4">
                    <Text className="font-display text-lg leading-7">Your booking</Text>
                    <Text className="mt-2 text-sm leading-5 text-muted-foreground">
                      {selection.items.join(" + ")}
                      {"\n"}
                      {date} · {time} · {artist.studio}
                    </Text>
                    <Text className="mt-3 font-semibold text-sm leading-5">Total · {inr(selection.total)}</Text>
                  </View>
                </>
              ) : null}
            </GentleIn>
          </ScrollView>
        </View>

        <GlassSurface className="border-t border-border px-3 pt-3" style={{ paddingBottom: Math.max(sz(16), insets.bottom) }}>
          <Button size="lg" className="w-full max-w-[25rem] self-center" disabled={step === 2 && !time} iconRight={ArrowRight} onPress={next}>
            {step === 3 ? "Confirm booking" : "Continue"}
          </Button>
        </GlassSurface>
      </KeyboardAvoidingView>

      <Header title="Book your moment" onBack={back} />
    </View>
  );
}
