export type JobType = 'NEW_GRAD' | 'MID_CAREER' | 'EXPERIENCED';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  jobType: JobType;
  targetField: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'name' | 'jobType'>;
}
