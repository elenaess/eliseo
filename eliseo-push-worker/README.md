# Elíseo Push Worker

Worker do Pre-Alpha 2 responsável por notificações Android via FCM HTTP v1.

## Segurança

- O APK envia somente Firebase ID Token + IDs do contexto.
- O Worker valida o ID Token e busca nome/avatar/mensagem/servidor/destinatários no Firestore.
- `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` ficam em secrets do Cloudflare.
- Call em DM é deduplicada no KV `PUSH_EVENTS`.

## Endpoints

- `POST /v1/dm-message`
- `POST /v1/server-message`
- `POST /v1/dm-call-join`
- `GET /health`

## Configuração

Use o script da raiz do patch `2_CONFIGURAR_PUSH_WORKER.ps1`. Ele lê o JSON de Service Account somente da localização informada, envia as duas credenciais como secrets e não copia o JSON para o repositório.
