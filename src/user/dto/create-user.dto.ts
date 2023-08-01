import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must have at least 10 characters' })
  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  @IsString()
  phone: string;
}
