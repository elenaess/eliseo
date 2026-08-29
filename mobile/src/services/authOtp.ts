import {auth} from './firebase';

const AUTH_API_URL = 'https://eliseo-auth.eliseeo.workers.dev';

type ApiOptions = {
  authenticated?: boolean;
};

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.authenticated) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch(`${AUTH_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      typeof data?.error === 'string' ? data.error : 'Não foi possível concluir a operação.',
    ) as Error & {status?: number; retryAfter?: number};
    error.status = response.status;
    error.retryAfter = Number(data?.retryAfter || 0);
    throw error;
  }
  return data as T;
}

export function requestVerificationOtp() {
  return post<{ok: true; retryAfter?: number; alreadyVerified?: boolean}>(
    '/v1/verification/send',
    {},
    {authenticated: true},
  );
}

export function confirmVerificationOtp(code: string) {
  return post<{ok: true}>(
    '/v1/verification/confirm',
    {code},
    {authenticated: true},
  );
}

export function requestPasswordOtp(email: string, authenticated = false) {
  return post<{ok: true; retryAfter?: number}>(
    '/v1/password/request',
    {email: email.trim().toLowerCase()},
    {authenticated},
  );
}

export function verifyPasswordOtp(
  email: string,
  code: string,
  authenticated = false,
) {
  return post<{ok: true; resetToken: string; email: string}>(
    '/v1/password/verify',
    {email: email.trim().toLowerCase(), code},
    {authenticated},
  );
}

export function resetPasswordWithOtp(
  email: string,
  resetToken: string,
  newPassword: string,
) {
  return post<{ok: true}>('/v1/password/reset', {
    email: email.trim().toLowerCase(),
    resetToken,
    newPassword,
  });
}
