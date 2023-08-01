/* eslint-disable prettier/prettier */
import { AuthGuard } from '@nestjs/passport';
import { applyDecorators, UseGuards } from '@nestjs/common';

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard()));
}
