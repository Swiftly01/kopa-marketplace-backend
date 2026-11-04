import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

// strips spaces, dashes and brackets so "0803 456 7891" and "+234-803-456-7891" both pass
export const PhoneNumber = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.replace(/[\s\-()]/g, '') : value,
    ),
    Matches(/^\+?\d{10,15}$/, { message: 'must be a valid phone number' }),
  );
