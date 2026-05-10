import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/response.utils';

type ValidateTarget = 'body' | 'query' | 'params';

// ─── Generic Zod validation middleware factory ─────────────────────────────────
// Per AI_Instructions.md §6: all POST/PATCH/PUT bodies validated before controllers
// Returns 422 with field-level errors on failure
export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fields = formatZodErrors(result.error);
      errorResponse(res, 422, 'VALIDATION_ERROR', 'One or more fields are invalid.', fields);
      return;
    }

    // Replace the target with the parsed (and stripped) value
    req[target] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (path) fields[path] = issue.message;
  }
  return fields;
}
