import {NativeModules, Platform} from 'react-native';

const module = NativeModules.EliseoCallTone;

export function playCallJoinSound() {
  if (Platform.OS !== 'android' || !module?.playJoin) return;
  module.playJoin();
}

export function playCallLeaveSound() {
  if (Platform.OS !== 'android' || !module?.playLeave) return;
  module.playLeave();
}
