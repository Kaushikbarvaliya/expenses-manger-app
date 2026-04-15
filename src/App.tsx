import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./navigation/AppNavigator";
import { CurrencyProvider } from "./context/CurrencyContext";

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { ActivityIndicator, View } from 'react-native';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" /></View>} persistor={persistor}>
        <SafeAreaProvider>
          <CurrencyProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </CurrencyProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
