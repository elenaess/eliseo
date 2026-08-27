import {registerPushBackgroundHandler} from './src/services/push';
import 'react-native-gesture-handler';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

registerPushBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
