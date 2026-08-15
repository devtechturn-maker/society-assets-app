import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import { preloadBrandAssets } from './src/utils/preloadBrandAssets';
// Side-effect: define background notification task in module scope (required by Expo).
import './src/services/backgroundVisitorNotificationTask';

import App from './App';

void preloadBrandAssets();

registerRootComponent(App);
