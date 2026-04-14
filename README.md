# Mobile (Expo)

## Setup

```bash
cd mobile
npm install
```

## Configure API base URL

Set `EXPO_PUBLIC_API_URL` before starting:

- iOS simulator (backend on your Mac): `http://localhost:8000/api`
- Android emulator (backend on your Mac): `http://10.0.2.2:8000/api`

Example:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api npm run ios
```

## Run

```bash
npm run start
```

If your environment runs Expo in non-interactive mode, use:

```bash
npm run start:ci
```

