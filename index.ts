import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
// Side-effect: define background notification task in module scope (required by Expo).
import './src/services/backgroundVisitorNotificationTask';

import App from './App';

// Register first so a failed asset preload cannot leave "main" unregistered.
registerRootComponent(App);

// Non-blocking preload after registration (ExpoAsset / fonts).
void import('./src/utils/preloadBrandAssets')
  .then(({ preloadBrandAssets }) => preloadBrandAssets())
  .catch(() => undefined);
