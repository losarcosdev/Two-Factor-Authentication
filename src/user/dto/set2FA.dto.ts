/* eslint-disable prettier/prettier */
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class Set2FADto {
  @IsNotEmpty()
  @IsBoolean()
  set2FA: boolean;
}
