import { z } from "zod";

const HTML_CHARS = /[<>]/;
const STRIPE_ID = /^[A-Za-z0-9_]+$/;
const SIMPLE_TOKEN = /^[A-Za-z0-9_-]+$/;

export const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !HTML_CHARS.test(value), "HTML is not allowed");

export const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    requiredText(max).optional(),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254)
  .refine((value) => !HTML_CHARS.test(value), "HTML is not allowed");

export const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  emailSchema.optional(),
);

export const ratingSchema = z.coerce.number().int().min(1).max(5);

export const stripeIdSchema = requiredText(120).regex(STRIPE_ID);

export const couponCodeSchema = requiredText(80).regex(SIMPLE_TOKEN);

export const optionalCouponCodeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  couponCodeSchema.optional(),
);

export const slugSchema = requiredText(160).regex(/^[A-Za-z0-9_:/.-]+$/);

export const linkedinSchema = requiredText(300).refine(
  (value) => /^(https?:\/\/)?(www\.)?linkedin\.com\/.+/i.test(value),
  "Please enter a valid LinkedIn profile URL",
);

export const githubHandleSchema = optionalText(80).refine(
  (value) => !value || /^[A-Za-z0-9-]+$/.test(value.replace(/^@/, "")),
  "Please enter a valid GitHub handle",
);

export const twitterHandleSchema = optionalText(80).refine(
  (value) => !value || /^[A-Za-z0-9_]+$/.test(value.replace(/^@/, "")),
  "Please enter a valid Twitter/X handle",
);

export const safeTextArraySchema = (maxItemLength: number, maxItems = 20) =>
  z.array(requiredText(maxItemLength)).min(1).max(maxItems);

export const feedbackRatingBlockSchema = z.object({
  rating: ratingSchema,
  comments: optionalText(1200).default(""),
});

export function firstFormValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export function parseJsonArrayField(value: unknown): unknown[] {
  const firstValue = firstFormValue(value);

  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  if (typeof firstValue !== "string" || firstValue.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(firstValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formString(value: unknown): string {
  const firstValue = firstFormValue(value);
  return typeof firstValue === "string" ? firstValue : "";
}

export function validationErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid request";
}
