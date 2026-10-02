import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard 400 validation error response per platform rule 2 and 4.
 */
export function validationError(error: ZodError | { error: ZodError }): NextResponse {
  const zodErr = "error" in error ? error.error : error;
  const message = zodErr.issues
    .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
    .join(", ");

  return NextResponse.json({ success: false, error: message }, { status: 400 });
}
