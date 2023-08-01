import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Otp, User } from './entities';
import { CreateUserDto, LoginUserDto } from './dto';
import {
  generateOTP,
  hashPassword,
  isTokenExpired,
  sendSMS,
  verifyPassword,
} from 'src/common';
import { VerificationCodeDto } from './dto/verification-code.dto';
import { Set2FADto } from './dto/set2FA.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly jwtService: JwtService,
  ) {}

  async register({ email, fullName, password, phone }: CreateUserDto) {
    try {
      const foundUser = await this.userRepository.findOne({ where: { email } });

      if (foundUser) {
        throw new BadRequestException('User already exist');
      }

      const hashedPassword = await hashPassword(password);

      const newUser = this.userRepository.create({
        fullName,
        email,
        phone,
        password: hashedPassword,
      });

      await this.userRepository.save(newUser);

      delete newUser.password;

      return {
        ...newUser,
        access_token: this.signJWT(newUser.id),
      };
    } catch (error) {
      this.handleErrors(error);
    }
  }

  async login({ email, password }: LoginUserDto) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        console.log('EMAIL');
        throw new UnauthorizedException('Incorrect email or password');
      }

      const passwordsMatch: boolean = verifyPassword({
        hashedPassword: user.password,
        password,
      });

      if (!passwordsMatch) {
        console.log('PASSWORD');
        throw new UnauthorizedException('Incorrect email or password');
      }

      // If the user has not two factor authentication enabled
      if (!user.twoFA) {
        const payload = {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          sub: user.id,
        };

        delete user.password;

        return {
          ...user,
          twoFA: false,
          access_token: this.signJWT(payload.id),
        };
      }

      // If it has, send OTP for 2FA
      return await this.sendOTP(
        user,
        'LOGIN',
        'Code for login sent,check inbox',
      );
    } catch (error) {
      this.handleErrors(error);
    }
  }

  // Send via SMS a code to verificate the phone number
  async sendCodeToVerifyPhone(user: User) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Checks if the user phone number is already verified
    if (user.isPhoneVerified) {
      return { success: true, successMessage: 'Phone number already verified' };
    }

    return await this.sendOTP(user, 'PHV', 'Code sent,check your inbox');
  }

  // Validate the code that was sent previously in the sendCodeToVerifyPhone().
  // if it matches returns true otherwise returns an error.
  async validatePhoneCode(user: User, { code }: VerificationCodeDto) {
    if (code.length !== 6) throw new BadRequestException('Invalid Code');
    if (!user) throw new UnauthorizedException();

    await this.getOTPRecord(user, code, 'PHV');

    const updatedUser = await this.userRepository.preload({
      id: user.id,
      isPhoneVerified: true,
    });

    await this.userRepository.save(updatedUser);

    return {
      success: true,
      messageSuccess: 'Phone number validated correctly',
    };
  }

  async set2FA(user: User, { set2FA }: Set2FADto) {
    if (!user) throw new UnauthorizedException();

    if (user.twoFA === set2FA) {
      return { success: true };
    }

    if (user.twoFA && set2FA === false) {
      return await this.sendOTP(
        user,
        'D2FA',
        'The code to disable 2 Factor Authentication , was sent',
      );
    }

    const updatedUser = await this.userRepository.preload({
      id: user.id,
      twoFA: set2FA,
    });

    await this.userRepository.save(updatedUser);

    return { success: true };
  }

  async disable2FA(user: User, { code }: VerificationCodeDto) {
    if (!user) throw new UnauthorizedException();
    if (code.length !== 6) throw new BadRequestException('Invalid Code');

    const otpRecord = await this.getOTPRecord(user, code, 'D2FA');

    const updatedUser = await this.userRepository.preload({
      id: user.id,
      twoFA: false,
    });

    await this.otpRepository.delete(otpRecord.id);
    await this.userRepository.save(updatedUser);

    return { success: true };
  }

  // Verificate if the code that was sent previously in the login() is valid
  async validateLoginOTP(user: User, { code }: VerificationCodeDto) {
    if (!user) throw new UnauthorizedException();
    if (code.length !== 6) throw new BadRequestException('Invalid Code');

    const otpRecord = await this.getOTPRecord(user, code, 'LOGIN');

    if (user.id !== otpRecord.userId)
      throw new NotFoundException('Invalid code');

    return {
      ...user,
      twoFA: true,
      access_token: this.signJWT(user.id),
    };
  }

  // A helper function to send an OTP (one-time-password) to the user.
  private async sendOTP(
    user: User,
    useCase: 'LOGIN' | 'D2FA' | 'PHV',
    messageSuccess: string,
  ): Promise<{
    success: boolean;
    messageSuccess: string;
  }> {
    const otp = generateOTP(6);

    const otpPayload = {
      user,
      userId: user.id,
      code: otp,
      useCase,
    } as Otp;

    const newOtp = this.otpRepository.create({
      ...otpPayload,
    });

    await this.otpRepository.save(newOtp);

    let message = '';

    const messages = {
      D2FA: `Use this code ${otp} to disable multifactor authentication on your account`,
      PHV: `Use this code ${otp} to verify the phone number registered on your account`,
      LOGIN: `Use this code ${otp} to log in to your account`,
    };

    if (useCase in messages) {
      message = messages[useCase];
    } else {
      throw new ForbiddenException('Invalid use case');
    }

    await sendSMS(user.phone, message);

    return { success: true, messageSuccess };
  }

  // A helper function to get and retrieve an existing OTP Record in the database
  private async getOTPRecord(
    user: User,
    code: string,
    useCase: 'LOGIN' | 'D2FA' | 'PHV',
  ): Promise<Otp> {
    const otpRecord = await this.otpRepository.findOne({
      where: { code, userId: user.id, useCase },
    });

    if (!otpRecord) throw new NotFoundException('Invalid code');

    const isExpired = isTokenExpired(otpRecord.expiresAt);

    if (isExpired) {
      await this.otpRepository.delete(otpRecord.id);
      throw new NotFoundException('Expired code');
    }

    return otpRecord;
  }

  private signJWT(id: string) {
    return this.jwtService.sign({ id });
  }

  private handleErrors(error: any): never {
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(`Unexpected error: ${error}`);
    throw new InternalServerErrorException('Server error - check logs');
  }
}
