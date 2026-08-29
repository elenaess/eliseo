# Elíseo Auth Worker

Worker de autenticação auxiliar do Elíseo para a alpha Android.

## O que ele faz

- envia OTP de 6 dígitos via Resend para `verification@eliseo.live`;
- confirma e-mail de contas Firebase e-mail/senha;
- exige OTP para recuperação/troca de senha;
- armazena apenas HMAC do OTP/reset token no KV;
- OTP expira em 10 minutos, reset token em 5 minutos;
- máximo de 5 tentativas por OTP e cooldown de 60 s;
- verifica Firebase ID Token localmente com as chaves públicas oficiais;
- usa OAuth de service account apenas no Worker para atualizar o Firebase Auth;
- resposta de recuperação não revela se o e-mail existe.

## 1. Resend

No Resend, adicione e verifique o domínio `eliseo.live` e crie uma API key
restrita a envio. O remetente usado é:

`Elíseo <verification@eliseo.live>`

Não coloque a API key no app, GitHub ou `wrangler.toml`.

## 2. Instalar

```powershell
cd C:\Users\ehren\eliseo\eliseo-auth-worker
npm.cmd install
npm.cmd test
```

## 3. Criar KV

```powershell
npx.cmd wrangler kv namespace create AUTH_KV
```

Copie o `id` retornado, depois:

```powershell
Copy-Item .\wrangler.example.toml .\wrangler.toml
notepad .\wrangler.toml
```

Troque `COLE_O_ID_DO_KV_AQUI` pelo ID real.

## 4. Secrets

Use os mesmos dados de service account Firebase que já estão no Worker de push.
Não cole os valores no código.

```powershell
npx.cmd wrangler secret put FIREBASE_CLIENT_EMAIL
npx.cmd wrangler secret put FIREBASE_PRIVATE_KEY
npx.cmd wrangler secret put RESEND_API_KEY
```

Crie um pepper aleatório de 32 bytes:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$pepper = [Convert]::ToBase64String($bytes)
$pepper | npx.cmd wrangler secret put OTP_PEPPER
Remove-Variable pepper,bytes,rng
```

## 5. Deploy

```powershell
npx.cmd wrangler deploy
```

O app está configurado para:

`https://eliseo-auth.eliseeo.workers.dev`

Se o Wrangler publicar outra URL, altere `AUTH_API_URL` em
`mobile/src/services/authOtp.ts`.

## Observação de segurança

O Worker depende das permissões IAM `firebaseauth.users.get` e
`firebaseauth.users.update` da service account. A chave privada e a API key
do Resend ficam apenas em secrets do Cloudflare.

O patch também passa Firebase ID Token nos uploads do mobile, mas o Worker
`eliseo-api` que recebe `/upload-media` não está versionado neste repositório.
Portanto a validação server-side desse token precisa ser auditada antes da
alpha pública.
