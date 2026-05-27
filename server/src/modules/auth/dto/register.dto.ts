import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(6, { message: '验证码为 6 位数字' })
  @MaxLength(6, { message: '验证码为 6 位数字' })
  code: string;

  @IsString()
  @MinLength(2, { message: '昵称至少 2 个字符' })
  @MaxLength(50, { message: '昵称最多 50 个字符' })
  nickname: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;
}
