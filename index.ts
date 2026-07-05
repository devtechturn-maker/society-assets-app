import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import { preloadBrandAssets } from './src/utils/preloadBrandAssets';

import App from './App';

void preloadBrandAssets();

registerRootComponent(App);
