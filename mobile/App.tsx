import React from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from './src/navigation/RootNavigator';
import {colors} from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.bg}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
        />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
