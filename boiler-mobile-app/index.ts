import { registerRootComponent } from 'expo';
import EventSource from 'react-native-sse';

// Polyfill EventSource for React Native
if (!global.EventSource) {
    // @ts-ignore
    global.EventSource = EventSource;
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
