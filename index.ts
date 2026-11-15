import 'react-native-gesture-handler';
import './src/core/notifier';   // defines the background task before anything else runs
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
