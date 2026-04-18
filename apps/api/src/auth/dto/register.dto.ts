import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '유효한 이메일을 입력하세요.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsEnum(['NEW_GRAD', 'MID_CAREER', 'EXPERIENCED'])
  jobType!: 'NEW_GRAD' | 'MID_CAREER' | 'EXPERIENCED';
}
