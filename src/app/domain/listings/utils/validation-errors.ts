import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface FieldError {
  field: string;
  message: string;
}

// flattens nested class-validator errors into the same shape main.ts returns
export function flattenValidationErrors(
  errors: ValidationError[],
  prefix = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = `${prefix}${error.property}`;
    const own = error.constraints
      ? [{ field, message: Object.values(error.constraints)[0] }]
      : [];
    const nested = error.children?.length
      ? flattenValidationErrors(error.children, `${field}.`)
      : [];
    return [...own, ...nested];
  });
}

// same payload as the global ValidationPipe so clients handle one error format
export function validationException(
  message: FieldError[],
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message,
    error: 'ValidationError',
  });
}
