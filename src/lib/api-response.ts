import type { ZodError } from "zod";

/**
 * JSON error bodies for Route Handlers, shaped `{ message, code, details }` so
 * `ApiError` in `src/lib/axios.ts` picks every field up.
 */
export const apiError = (status: number, message: string, code?: string, details?: unknown) =>
  Response.json({ message, code, details }, { status });

export const unauthenticated = () => apiError(401, "Unauthenticated.", "unauthenticated");

export const notFound = () => apiError(404, "Not found.", "not_found");

export const serverError = (message = "Unexpected server error.") =>
  apiError(500, message, "server_error");

/** 422 with `details` keyed by dotted field path, e.g. `legs.0.status`. */
export const validationError = (error: ZodError) => {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (details[key] ??= []).push(issue.message);
  }

  return apiError(422, "The given data was invalid.", "validation_error", details);
};
