# Running the React Native Expense Manager App

## Prerequisites
- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- React Native development environment
- MongoDB database (for backend)

## Backend Setup
1. Navigate to backend directory:
```bash
cd expenses-manger-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=8000
```

4. Start the backend server:
```bash
npm run dev
```

## Frontend Setup
1. Navigate to app directory:
```bash
cd expenses-manger-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
EXPO_PUBLIC_ANDROID_EMULATOR=true
```

4. Start the React Native app:
```bash
npm run start
```

## Alternative Start Commands
- For iOS simulator: `npm run ios`
- For Android emulator: `npm run android`
- For web version: `npm run web`
- Fixed port (if port 8081 is busy): `npm run start:fixed`

## Troubleshooting

### If "npx expo start" fails:
Use the npm script instead:
```bash
npm run start
```

### If port 8081 is busy:
```bash
npm run start:fixed
```

### If API connection fails:
1. Ensure backend server is running on port 8000
2. Check EXPO_PUBLIC_API_URL in .env file
3. For Android emulator, make sure EXPO_PUBLIC_ANDROID_EMULATOR=true

### Metro bundler issues:
```bash
npx expo start --clear
```

## Testing the App

### Guest Mode Testing:
1. Open app without logging in
2. Add expenses and income
3. Verify data persists after app restart
4. Check "Guest Mode" indicator on dashboard

### Login and Merge Testing:
1. Create guest data (add some expenses/income)
2. Click Login button
3. Login with valid credentials
4. Verify merge modal appears
5. Test both "Yes, Merge" and "No, Delete It" options
6. Check merge results and data consistency

### Logout Testing:
1. Login and add some data
2. Logout
3. Verify guest data is restored
4. Verify user data is cleared

## Key Features Implemented

### Guest Mode
- Add expenses/income without login
- Local data persistence with AsyncStorage
- No forced login popups

### Seamless Login Flow
- Login only when explicitly requested
- Automatic guest data merge
- UUID-based duplicate prevention
- Guest mode indicator

### Data Management
- Separate guest and user data states
- Automatic sync when online
- Offline-first approach
- Proper error handling

## Development Notes

### UUID Generation
- Uses `uuid` package for proper UUID generation
- Preserves UUIDs during merge process
- Prevents duplicate entries effectively

### State Management
- Redux Toolkit with separate buckets
- Redux Persist for data persistence
- Automatic state restoration

### API Integration
- Single merge endpoint for efficiency
- Comprehensive validation
- Detailed error reporting
