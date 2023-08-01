import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, Set2FADto, LoginUserDto } from './dto';
import { Auth, GetUser } from 'src/common/decorators';
import { User } from './entities';
import { VerificationCodeDto } from './dto/verification-code.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @Auth()
  @Post('phone/send-code')
  sendCodeToVerifyPhone(@GetUser() user: User) {
    return this.userService.sendCodeToVerifyPhone(user);
  }

  @Auth()
  @Post('phone/validate-code')
  validatePhoneCode(
    @Body() verificationCodeDto: VerificationCodeDto,
    @GetUser() user: User,
  ) {
    return this.userService.validatePhoneCode(user, verificationCodeDto);
  }

  @Auth()
  @Post('set/twofa')
  set2FA(@Body() set2FADto: Set2FADto, @GetUser() user: User) {
    return this.userService.set2FA(user, set2FADto);
  }

  @Auth()
  @Post('disable-twofa/verify')
  disable2FA(
    @Body() verificationCodeDto: VerificationCodeDto,
    @GetUser() user: User,
  ) {
    return this.userService.disable2FA(user, verificationCodeDto);
  }

  @Auth()
  @Post('login/verify/token')
  validateLoginOTP(
    @Body() verificationCodeDto: VerificationCodeDto,
    @GetUser() user: User,
  ) {
    return this.userService.validateLoginOTP(user, verificationCodeDto);
  }
}
