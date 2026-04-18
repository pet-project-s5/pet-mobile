# 🐾 Cuddle — Pet Shop Mobile

Aplicativo mobile de cuidados com pets desenvolvido em **React Native + Expo**, com backend **TypeScript + Express + Prisma + PostgreSQL** e suporte a dicas personalizadas geradas por **IA (Groq Cloud)**.

---

## ✨ Funcionalidades

| Área | Destaques |
|---|---|
| **Autenticação** | Login com JWT, sessão persistente via AsyncStorage, cadastro em 3 etapas |
| **Pets** | Cadastro com espécie/raça (chips + modal), seleção de porte/porte/pelagem, foto com editor de imagem |
| **Agendamentos** | Calendário visual, seleção de horário em chips, filtro de serviços por espécie do pet, confirmação via modal, cancelamento com confirmação |
| **Serviços** | Grade de serviços com ícones mapeados por nome (banho 🛁, tosa ✂️, consulta 🩺 etc.) |
| **Perfil do usuário** | Foto de perfil editável, informações mascaradas (CPF/telefone), tema escuro, seletor de idioma (PT/EN/ES) |
| **Notificações** | Centro de notificações scrollável e persistente; lembretes de agendamentos próximos (< 24h); dicas de IA personalizadas por raça/espécie com disclaimer |
| **Editor de imagem** | Modal com grid de terços, zoom, pan, flip horizontal/vertical, confirmação antes de salvar |
| **Tema escuro** | Aplicado globalmente via `SettingsContext` |
| **Multi-idioma** | Português, English, Español |

---

## 🏗️ Arquitetura

```
pet-mobile/
├── cuddle/                  # Front-end React Native (Expo)
├── pet-api-ts/              # Back-end TypeScript (Express + Prisma)
├── docker-compose.yml       # Orquestra front + api + banco
└── .env                     # Variáveis do banco e JWT
```

---

## 🚀 Rodando com Docker (recomendado)

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd pet-mobile
```

### 2. Configure as variáveis de ambiente

Copie e edite o `.env` na raiz:

```bash
cp .env.example .env
```

```env
# .env (raiz)
POSTGRES_DB=petapi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_aqui
JWT_SECRET=sua_chave_jwt_aqui
```

Configure a chave Groq para dicas de IA em `cuddle/.env`:

```env
# cuddle/.env
EXPO_PUBLIC_GROQ_API_KEY=gsk_xxxxxxxxxxxxxx
```

> Obtenha sua chave gratuita em [console.groq.com](https://console.groq.com). Sem a chave, o app usa dicas estáticas como fallback.

### 3. Suba tudo

```bash
docker compose up --build
```

| Serviço | URL |
|---|---|
| App web | http://localhost:8081 |
| API | http://localhost:8080 |
| Banco | localhost:5432 |

### 4. Rebuild (após alterar arquivos `.jsx`/`.js`)

```bash
docker compose up --build web
```

---

## 📱 Rodando no celular com Expo Go

Útil para testar no dispositivo físico sem Docker.

### Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- [Expo Go](https://expo.dev/go) instalado no celular

### Passos

```bash
cd cuddle
npm install
npx expo start
```

Escaneie o QR Code com o Expo Go (Android) ou câmera nativa (iOS).

> ⚠️ Celular e computador precisam estar na **mesma rede Wi-Fi**.  
> Para redes com restrição: `npx expo start --tunnel`

---

## 🗂️ Estrutura do front-end

```
cuddle/
├── App.js                          # Navigator + SettingsProvider
├── .env                            # EXPO_PUBLIC_GROQ_API_KEY
└── src/
    ├── assets/icons/               # Logo.png, frameBackground.png
    ├── components/
    │   └── common/
    │       └── ImageEditModal.jsx  # Editor de imagem (zoom, flip, grid)
    ├── contexts/
    │   └── SettingsContext.js      # Tema escuro + idioma (persistidos)
    ├── screens/
    │   ├── Auth/
    │   │   ├── Login/              # Login com JWT
    │   │   └── Register/           # Cadastro em 3 etapas com Stepper
    │   ├── Elements/
    │   │   ├── BottomNav.jsx       # Barra de navegação inferior
    │   │   └── LoadingView.jsx     # Tela de carregamento
    │   ├── Main/
    │   │   ├── Home/               # Grid de pets + centro de notificações
    │   │   ├── Pet/
    │   │   │   ├── PetEdit.jsx     # Criar/editar pet (chips de espécie, raça, etc.)
    │   │   │   └── PetProfile.jsx  # Perfil do pet com foto
    │   │   ├── Profile/
    │   │   │   └── UserProfile.jsx # Perfil do usuário, tema, idioma
    │   │   ├── Schedule/
    │   │   │   ├── Schedule.jsx        # Lista de agendamentos
    │   │   │   └── ScheduleCreate.jsx  # Novo agendamento com calendário
    │   │   └── Services/           # Grade de serviços disponíveis
    │   └── Splash/                 # Splash com verificação de sessão
    └── services/
        ├── api.js                  # Chamadas HTTP ao backend
        ├── auth.js                 # Token JWT (memória + AsyncStorage)
        ├── groqAI.js               # Dicas de IA via Groq Cloud (com cache)
        ├── petTips.js              # Dicas estáticas (fallback)
        ├── photoPicker.js          # Seleção de foto (web: input file / native: ImagePicker)
        └── photoStorage.js         # Persistência de foto (web: base64 / native: FileSystem)
```

---

## 🛠️ Tecnologias

### Front-end

| Tecnologia | Versão |
|---|---|
| Expo SDK | ~54.0.0 |
| React | 19.1.0 |
| React Native | 0.81.5 |
| React Navigation (native-stack) | ^7.x |
| lucide-react-native | ^0.575.0 |
| expo-image-picker | SDK 54 |
| expo-image-manipulator | SDK 54 |
| @react-native-async-storage/async-storage | ^2.x |
| react-native-safe-area-context | ^5.x |
| @expo-google-fonts/kanit | ^0.4.x |

### Back-end

| Tecnologia | Versão |
|---|---|
| Node.js | 20 |
| TypeScript | ^5.x |
| Express | ^4.x |
| Prisma ORM | ^6.x |
| PostgreSQL | 15 |
| JWT (jsonwebtoken) | ^9.x |
| Zod | ^3.x |

### IA

| Serviço | Modelo |
|---|---|
| [Groq Cloud](https://groq.com) | `llama-3.1-8b-instant` |

---

## 🔔 Sistema de notificações

O sino no canto superior direito da Home abre um **centro de notificações** com:

- **Dicas de IA** ✨ — geradas pelo Groq com base na espécie, raça e idade do pet. A cada 30 minutos uma nova categoria é sorteada (higiene, alimentação, comportamento, enriquecimento ambiental, etc.). Todas incluem disclaimer: *"Consulte sempre um veterinário para orientações médicas."*
- **Lembretes de agendamento** 📅 — disparados quando um agendamento está a menos de 24h, com nome do pet, serviço e horário.

As notificações são **persistidas no AsyncStorage** e acumulam até 50 itens. Podem ser limpas pelo botão "Limpar".

---

## 🐛 Problemas comuns

**`docker compose up` falha com erro de OpenSSL**  
O Dockerfile da API já inclui `apk add openssl`. Certifique-se de estar usando a imagem `node:20-alpine`.

**App web em branco após rebuild**  
Limpe o cache do Docker:
```bash
docker compose down
docker builder prune -f
docker compose up --build
```

**Expo Go: QR Code não conecta**  
```bash
npx expo start --tunnel
```

**Fonte não carrega / UnableToResolveError**  
```bash
cd cuddle
Remove-Item -Recurse -Force node_modules   # PowerShell
npm install
npx expo start --clear
```
