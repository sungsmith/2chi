import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthTokensDto, LoginInput, RegisterInput } from '@2chi/shared';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => api.post<AuthTokensDto>('/auth/login', data),
    onSuccess: (res) => {
      if (res.success) {
        setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
        document.cookie = `2chi-auth=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
        router.push('/');
      }
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => api.post<AuthTokensDto>('/auth/register', data),
    onSuccess: (res) => {
      if (res.success) {
        setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
        document.cookie = `2chi-auth=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
        router.push('/');
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return () => {
    logout();
    document.cookie = '2chi-auth=; path=/; max-age=0';
    router.push('/login');
  };
}
