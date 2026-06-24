// =============================================================================
// Shared API helpers
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function parseFormData(request: NextRequest): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

export async function validated<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const body = await parseJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));
    return {
      ok: false,
      response: NextResponse.json({ error: 'Validation failed', issues }, { status: 422 })
    };
  }
  return { ok: true, data: parsed.data };
}

export function handleZod(err: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    },
    { status: 422 }
  );
}
