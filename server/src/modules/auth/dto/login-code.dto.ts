import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginCodeDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}
