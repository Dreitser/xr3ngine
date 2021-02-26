
console.log('worker!')
import { MainProxy, receiveWorker } from './worker/MessageQueue';
import { initializeEngineOffscreen } from './initializeOffscreen'

receiveWorker((args: any, proxy: MainProxy) => {
  initializeEngineOffscreen(args, proxy)
}).then((proxy: MainProxy) => {

});
