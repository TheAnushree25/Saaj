import { createHash } from "node:crypto";
import { env } from "../../config/env.ts";
import type { Role } from "../../db/schema/index.ts";
import { AppError, forbidden } from "../../lib/errors.ts";
import type { AccessClaims } from "../auth/tokens.ts";

export const uploadPurposes = ["avatar", "artist-profile", "artist-cover", "portfolio", "service"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

/** Who may upload what. */
const allowedRoles: Record<UploadPurpose, Role[]> = {
  avatar: ["customer", "artist", "admin"],
  "artist-profile": ["artist"],
  "artist-cover": ["artist"],
  portfolio: ["artist"],
  service: ["admin"],
};

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic";

const uploadsReady = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

const notConfigured = () =>
  new AppError(503, "UPLOADS_NOT_CONFIGURED", "Image uploads are not set up on this server yet.");

/** Each person uploads into their own folder, e.g. saaj/portfolio/<user id>. */
const folderFor = (purpose: UploadPurpose, userId: string) => `saaj/${purpose}/${userId}`;

/**
 * Photos go from the phone or browser straight to Cloudinary, never through
 * our server. We only sign the request: proof that we allowed this upload,
 * into this folder, in these formats, now. The secret itself never leaves here.
 */
export function signUpload(auth: AccessClaims, purpose: UploadPurpose) {
  if (!allowedRoles[purpose].includes(auth.role)) throw forbidden("You cannot upload this kind of image.");
  if (!uploadsReady()) throw notConfigured();

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = folderFor(purpose, auth.userId);
  // Cloudinary's rule: parameters sorted by name, joined as a=1&b=2, then the secret, then SHA-1.
  const toSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest("hex");

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: { api_key: env.CLOUDINARY_API_KEY, timestamp, folder, allowed_formats: ALLOWED_FORMATS, signature },
  };
}

/**
 * The app uploads, then sends us back the image's public id. We check it lives
 * in the caller's own folder (so nobody can claim someone else's photo) and
 * turn it into the address the apps will load.
 */
export function imageUrlFor(publicId: string, purpose: UploadPurpose, userId: string) {
  if (!uploadsReady()) throw notConfigured();
  if (!publicId.startsWith(`${folderFor(purpose, userId)}/`) || publicId.includes("..")) {
    throw forbidden("That image does not belong to you.");
  }
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
}
