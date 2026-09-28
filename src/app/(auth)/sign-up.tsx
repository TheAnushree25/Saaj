import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { AuthField, PasswordToggle, PhonePrefix } from "@/features/auth/components/auth-field";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ShimmerButton } from "@/features/auth/components/shimmer-button";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas";
import { useShake } from "@/features/auth/use-shake";
import { useAuth } from "@/features/auth/auth-provider";
import { leaveAuth, switchAuth } from "@/features/auth/auth-navigation";
import { showServerError } from "@/features/auth/server-errors";
import { hapticImpact, hapticSuccess } from "@/lib/haptics";
import { useSaj } from "@/store/saj-store";

/** Create an account (name, mobile number, password) on the Saaj API. */
export default function SignUp() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const { finishOnboarding } = useSaj();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { style: shakeStyle, shake } = useShake();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", phone: "", password: "" },
    mode: "onTouched",
  });

  const submit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        await signUp(values);
      } catch (error) {
        hapticImpact();
        shake();
        setFormError(showServerError(error, ["fullName", "phone", "password"], setError));
        return;
      }
      hapticSuccess();
      finishOnboarding();
      leaveAuth(then);
    },
    () => {
      hapticImpact();
      shake();
    },
  );

  return (
    <AuthShell title={"Your bridal\nstory starts here."} intro="Create an account to save artists, plan your services and keep every booking in one calm place.">
      <Animated.View style={shakeStyle}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label="FULL NAME"
              placeholder="Ananya Sharma"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              ref={phoneRef}
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
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
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

      {formError ? (
        <Text accessibilityLiveRegion="polite" className="mb-3 text-xs leading-4 text-[#C0392B]">
          {formError}
        </Text>
      ) : null}

      <View className="mt-2">
        <ShimmerButton label="Create account" loading={isSubmitting} onPress={submit} />
      </View>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm leading-5 text-muted-foreground">Already have an account? </Text>
        <Pressable onPress={() => switchAuth("/sign-in", then)} hitSlop={8}>
          <Text className="font-semibold text-sm leading-5 text-primary">Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
