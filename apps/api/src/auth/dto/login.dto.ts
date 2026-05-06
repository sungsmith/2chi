import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일을 입력하세요.' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
