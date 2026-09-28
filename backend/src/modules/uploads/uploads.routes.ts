import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../../app-env.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth } from "../../middleware/auth.ts";
import { signUpload, uploadPurposes } from "./cloudinary.ts";

export const uploadRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post("/sign", validate("json", z.object({ purpose: z.enum(uploadPurposes) })), (c) =>
    c.json(signUpload(c.var.auth, c.req.valid("json").purpose)),
  );
