import z from "zod";

const base64url = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+$/);

const credentialFields = {
  id: base64url(2048),
  rawId: base64url(2048),
  type: z.literal("public-key"),
  authenticatorAttachment: z
    .enum(["platform", "cross-platform"])
    .nullish()
    .transform((value) => value ?? undefined),
  clientExtensionResults: z
    .object({
      appid: z.boolean().optional(),
      credProps: z.object({ rk: z.boolean().optional() }).optional(),
    })
    .default({}),
};

export const registrationResponseSchema = z
  .object({
    ...credentialFields,
    response: z.object({
      clientDataJSON: base64url(4096),
      attestationObject: base64url(48 * 1024),
      authenticatorData: base64url(4096).optional(),
      publicKey: base64url(4096).optional(),
      publicKeyAlgorithm: z.number().int().optional(),
      transports: z
        .array(z.enum(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"]))
        .max(8)
        .optional(),
    }),
  })
  .refine((value) => value.id === value.rawId);

export const authenticationResponseSchema = z
  .object({
    ...credentialFields,
    response: z.object({
      clientDataJSON: base64url(4096),
      authenticatorData: base64url(4096),
      signature: base64url(4096),
      userHandle: base64url(128)
        .nullish()
        .transform((value) => value ?? undefined),
    }),
  })
  .refine((value) => value.id === value.rawId);
