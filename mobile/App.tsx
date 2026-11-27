import React from 'react';
import {StatusBar, Text, Pressable, ScrollView} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {colors} from './src/theme';

class StartupBoundary extends React.Component<
  {children: React.ReactNode},
  {error: Error | null; attempt: number}
> {
  state = {error: null as Error | null, attempt: 0};

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[Psiu startup]', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg}}>
          <Text style={{color: '#fff', fontSize: 22, fontWeight: '700'}}>Não foi possível abrir esta tela</Text>
          <Text selectable style={{color: '#c4c4c4', marginVertical: 16}}>{String(this.state.error.message || this.state.error).slice(0, 1000)}</Text>
          <Pressable accessibilityRole="button" onPress={() => this.setState(s => ({error: null, attempt: s.attempt + 1}))} style={{backgroundColor: colors.blue, borderRadius: 12, padding: 14}}>
            <Text style={{color: '#fff', textAlign: 'center'}}>Tentar novamente</Text>
          </Pressable>
        </ScrollView>
      );
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}

function StartupContent() {
  const Navigator = require('./src/navigation/RootNavigator').RootNavigator;
  return <Navigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.bg}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
        />
        <StartupBoundary><StartupContent /></StartupBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
