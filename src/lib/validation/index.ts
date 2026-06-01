import { z } from "zod";
import { apiError } from "@/lib/api/response";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

function formatValidationError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}

export function validateRequest<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    response: apiError(`Invalid request: ${formatValidationError(parsed.error)}`, 400),
  };
}

export function searchParamsToObject(params: URLSearchParams) {
  return Object.fromEntries(params.entries());
}

const numericString = z
  .string()
  .trim()
  .refine((value) => value.length > 0, "Required")
  .refine((value) => Number.isFinite(Number(value)), "Must be a finite number");

export const positiveNumericString = numericString.refine(
  (value) => Number(value) > 0,
  "Must be greater than 0",
);

export const nonNegativeNumericString = numericString.refine(
  (value) => Number(value) >= 0,
  "Must be greater than or equal to 0",
);

export const symbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9_/-]+$/, "Unsupported symbol format");

export const limitSchema = z.coerce.number().int().min(1).max(1_000);
