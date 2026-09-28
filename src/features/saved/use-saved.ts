import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api";
import type { SavedArtist } from "@/lib/api-types";
import { hapticImpact } from "@/lib/haptics";
import { keys } from "@/lib/queries";

/** Sends a guest to sign in, then back to where she was. */
export function askToSignIn() {
  router.push({ pathname: "/sign-in", params: { then: "back" } });
}

/**
 * The bride's shortlist, kept on the server so it follows her to any phone.
 * The heart changes at once (optimistic update); if the server refuses, it
 * changes back.
 */
export function useSaved() {
  const { status } = useAuth();
  const signedIn = status === "signed-in";
  const client = useQueryClient();

  const query = useQuery({
    queryKey: keys.saved,
    queryFn: () => api<{ items: SavedArtist[] }>("/v1/me/saved-artists").then((r) => r.items),
    enabled: signedIn,
  });

  const mutation = useMutation({
    mutationFn: ({ artist, save }: { artist: SavedArtist; save: boolean }) =>
      api(`/v1/me/saved-artists/${artist.id}`, { method: save ? "PUT" : "DELETE" }),
    onMutate: async ({ artist, save }) => {
      await client.cancelQueries({ queryKey: keys.saved });
      const before = client.getQueryData<SavedArtist[]>(keys.saved);
      client.setQueryData<SavedArtist[]>(keys.saved, (list = []) => {
        const others = list.filter((a) => a.id !== artist.id);
        return save ? [artist, ...others] : others;
      });
      return { before };
    },
    onError: (_error, _vars, context) => client.setQueryData(keys.saved, context?.before),
    onSettled: () => client.invalidateQueries({ queryKey: keys.saved }),
  });

  const saved = signedIn ? (query.data ?? []) : [];
  const ids = new Set(saved.map((a) => a.id));

  return {
    saved,
    isLoading: signedIn && query.isPending,
    isError: signedIn && query.isError,
    refetch: query.refetch,
    isSaved: (id: string) => ids.has(id),
    toggle: (artist: SavedArtist) => {
      if (!signedIn) return askToSignIn();
      hapticImpact();
      mutation.mutate({ artist, save: !ids.has(artist.id) });
    },
  };
}
