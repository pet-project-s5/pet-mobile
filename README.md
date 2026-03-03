# 🐾 Cuddle — pet-mobile

Aplicativo mobile de cuidados com pets desenvolvido em **React Native** com **Expo**.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) (vem junto com o Node.js)
- [Expo Go](https://expo.dev/go) no seu celular (iOS ou Android)

---

## 🚀 Como rodar o projeto

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd pet-mobile
```

### 2. Acesse a pasta do projeto

```bash
cd cuddle
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Inicie o servidor de desenvolvimento

```bash
npx expo start
```

> Para limpar o cache do Metro bundler (recomendado quando há erros estranhos):
>
> ```bash
> npx expo start --clear
> ```

### 5. Abra no celular

Após iniciar, um **QR Code** será exibido no terminal.

- **iOS** → Abra a câmera nativa e aponte para o QR Code
- **Android** → Abra o app **Expo Go** e escaneie o QR Code

> ⚠️ O celular e o computador precisam estar na **mesma rede Wi-Fi**.

---

## 📱 Rodar em emulador

```bash
# Android
npx expo start --android

# iOS (apenas macOS)
npx expo start --ios
```

---

## 🗂️ Estrutura do projeto

```
cuddle/
├── App.js                  # Navegação principal (Stack)
├── index.js                # Entry point
├── package.json
└── src/
    ├── assets/
    │   └── icons/          # Imagens (Logo.png, frameBackground.png)
    ├── screens/
    │   ├── Auth/
    │   │   ├── Login/      # Tela de login
    │   │   └── Register/   # Tela de cadastro (3 etapas)
    │   ├── Elements/       # Componentes reutilizáveis (Stepper, Logo)
    │   └── Splash/         # Tela de splash
```

---

## 🛠️ Tecnologias utilizadas

| Tecnologia                      | Versão   |
| ------------------------------- | -------- |
| Expo SDK                        | ~54.0.0  |
| React                           | 19.1.0   |
| React Native                    | 0.81.5   |
| React Navigation (native-stack) | ^7.x     |
| lucide-react-native             | ^0.575.0 |
| @expo-google-fonts/kanit        | ^0.4.1   |
| @expo-google-fonts/krona-one    | ^0.4.1   |
| @expo-google-fonts/silkscreen   | ^0.4.2   |

---

## ⚠️ Problemas comuns

**Erro de fonte / UnableToResolveError .ttf**

```bash
Remove-Item -Recurse -Force node_modules
npm install
```

**QR Code não abre / conexão recusada**

- Verifique se celular e PC estão na mesma rede Wi-Fi
- Tente mudar para conexão via tunnel: `npx expo start --tunnel`

**Tela em branco / componente não atualiza**

```bash
npx expo start --clear
```
