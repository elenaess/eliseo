# Integração do backend — próxima etapa

Este starter está propositalmente desacoplado do backend para validar primeiro
a experiência React Native.

Mapeamento planejado para o código atual do Elíseo:

- Auth:
  `@react-native-firebase/app` + `@react-native-firebase/auth`
  usando o mesmo projeto Firebase do desktop.

- Feed:
  portar as operações equivalentes a `listenToPosts`, `createPost`,
  `togglePostLike`, `repostPost`, comentários e usuários.

- Comunidades:
  mesmas coleções Firestore de `servers`, `channels` e mensagens.

- DMs:
  mesmas conversas e cartões PIX já existentes.

- Drive:
  manter Firestore para metadados e o Worker/R2 já existente para arquivos.
  Quota precisa continuar sendo validada no servidor antes de produção.

- PIX:
  reaproveitar o gerador EMV (`pix.ts`) como módulo TypeScript compartilhável.
  A UI será totalmente nativa.

- Calls:
  usar `react-native-webrtc` para mídia nativa e manter a sinalização Firestore.
  Os controles da UI nativa já correspondem aos controles reais atuais:
  câmera, áudio recebido, mutar/desmutar, levantar mão e sair.
  Não há compartilhamento de tela neste starter.

A ideia é compartilhar contratos/lógica, não compartilhar componentes web.
