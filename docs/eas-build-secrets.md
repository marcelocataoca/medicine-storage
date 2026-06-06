# Variáveis de ambiente para build EAS (Firebase)

O app usa o SDK JavaScript do Firebase (`lib/firebase.ts`). As credenciais são lidas de variáveis `EXPO_PUBLIC_*`, que precisam existir **no momento do build** — o `.env` local não é enviado ao EAS.

Sem essas variáveis, o APK abre e fecha com:

```text
Firebase config ausente. Defina: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId em EXPO_PUBLIC_FIREBASE_* no .env
```

## Variáveis obrigatórias

| Variável | Origem no Firebase Console |
|----------|----------------------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Configurações do projeto → Geral → Chave da API da Web |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Configurações do projeto → Geral → `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ID do projeto |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Storage (ex.: `projeto.appspot.com`) |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Número do remetente (FCM) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | App Android → `mobilesdk_app_id` (ou `google-services.json` → `mobilesdk_app_id`) |

Valores de referência também estão em `google-services.json` (raiz) e devem bater com o package `com.kenjimarcelo.medicinestorage` definido em `app.json`.

## Onde estão configuradas hoje

### Desenvolvimento local

Copie `.env.example` para `.env` na raiz e preencha. Reinicie o Metro após alterar:

```bash
npx expo start --clear
```

### Build EAS (APK preview e production)

As seis variáveis ficam no **EAS Environment Variables** do projeto (não versionadas no Git). O [`eas.json`](../eas.json) contém apenas a estrutura dos perfis de build.

Variáveis com prefixo `EXPO_PUBLIC_` são injetadas automaticamente durante o build nos ambientes `preview` e `production`.

> **Nota:** variáveis `EXPO_PUBLIC_*` são embutidas no bundle do cliente (não são secretas no sentido de backend). Mantê-las no EAS evita expor os valores no repositório, mas elas ainda aparecem no APK instalado.

#### Criar ou atualizar variáveis

```bash
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..." --environment preview --environment production --visibility plaintext --scope project
eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "..." --environment preview --environment production --visibility plaintext --scope project
eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "..." --environment preview --environment production --visibility plaintext --scope project
eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "..." --environment preview --environment production --visibility plaintext --scope project
eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "..." --environment preview --environment production --visibility plaintext --scope project
eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "..." --environment preview --environment production --visibility plaintext --scope project
```

Use `--force` para sobrescrever um valor existente. Liste as variáveis com:

```bash
eas env:list --environment preview
eas env:list --environment production
```

## Gerar APK de teste (perfil preview)

```bash
eas build --profile preview --platform android
```

Instale o APK no dispositivo e teste. É necessário **novo build** sempre que alterar variáveis Firebase no EAS.

## `google-services.json`

Para Expo, o arquivo fonte fica na **raiz** do projeto; `app.json` referencia com `"googleServicesFile": "./google-services.json"`. O EAS/prebuild copia para `android/app/google-services.json` — não é necessário commitar a pasta `android/`.

## Checklist antes do build

- [ ] EAS → variáveis `EXPO_PUBLIC_FIREBASE_*` nos ambientes `preview` e `production`
- [ ] `google-services.json` na raiz (local; ver `.gitignore`)
- [ ] `app.json` → `android.package` = `com.kenjimarcelo.medicinestorage`
- [ ] `.env` preenchido para desenvolvimento local (espelha os mesmos valores)
