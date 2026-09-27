import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthField, PasswordToggle, PhonePrefix } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { OrDivider } from "@/features/auth/components/or-divider";
import { ShimmerButton } from "@/features/auth/components/shimmer-button";
import { signInSchema, type SignInInput } from "@/features/auth/schemas";
import { useShake } from "@/features/auth/use-shake";
import { hapticImpact, hapticSuccess } from "@/lib/haptics";
import { useSaj } from "@/store/saj-store";

/**
 * Sign in with mobile number + password. The form validates for real; the
 * submit simply enters the app until Supabase auth is added (guide step 13).
 */
export default function SignIn() {
  const { finishOnboarding } = useSaj();
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const { style: shakeStyle, shake } = useShake();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { phone: "", password: "" },
    mode: "onTouched",
  });

  const enter = () => {
    finishOnboarding();
    router.replace("/home");
  };

  const submit = handleSubmit(
    async () => {
      hapticSuccess();
      await new Promise((r) => setTimeout(r, 700));
      enter();
    },
    () => {
      hapticImpact();
      shake();
    },
  );

  return (
    <AuthShell title={"Let’s begin\nbeautifully."} intro="Sign in with your mobile number and password to see your bookings and saved artists.">
      <Animated.View style={shakeStyle}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="MOBILE NUMBER"
              prefix={<PhonePrefix />}
              placeholder="98765 43210"
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={10}
              returnKeyType="next"
              value={value}
              onChangeText={(t) => onChange(t.replace(/\D/g, ""))}
              onBlur={onBlur}
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              ref={passwordRef}
              label="PASSWORD"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              autoCapitalize="none"
              returnKeyType="go"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              onSubmitEditing={submit}
              error={errors.password?.message}
              suffix={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
            />
          )}
        />
      </Animated.View>

      <Pressable
        onPress={() => Alert.alert("Forgot password?", "Password reset by SMS is coming soon. Until then, you can explore SAJ as a guest.")}
        hitSlop={8}
        className="-mt-1 mb-6 self-end"
      >
        <Text className="font-semibold text-xs leading-4 text-primary">Forgot password?</Text>
      </Pressable>

      <ShimmerButton label="Sign in" loading={isSubmitting} onPress={submit} />
      <OrDivider />
      <Button variant="outline" size="lg" className="w-full" onPress={enter}>
        Explore as guest
      </Button>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm leading-5 text-muted-foreground">New to SAJ? </Text>
        <Pressable onPress={() => router.push("/sign-up")} hitSlop={8}>
          <Text className="font-semibold text-sm leading-5 text-primary">Create account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
