/* eslint-disable prettier/prettier */
import { IsString, Length } from 'class-validator';
export class VerificationCodeDto {
  @IsString()
  @Length(6, 6, { message: 'OTP Code not valid , try again' })
  code: string;
}
