import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api";

/**
 * Puts a server error where the bride will see it: under the field it is
 * about ("This number is already registered" under the phone field), or, when
 * it is about the whole form, as the message this returns.
 */
export function showServerError<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";

  const isField = (path: string): path is Path<T> => (fields as readonly string[]).includes(path);

  const phone = "phone";
  if (error.code === "PHONE_TAKEN" && isField(phone)) {
    setError(phone, { message: error.message });
    return null;
  }

  if (error.code === "VALIDATION_FAILED" && Array.isArray(error.details)) {
    let placed = false;
    for (const issue of error.details as { path: string; message: string }[]) {
      if (isField(issue.path)) {
        setError(issue.path, { message: issue.message });
        placed = true;
      }
    }
    if (placed) return null;
  }

  return error.message;
}
