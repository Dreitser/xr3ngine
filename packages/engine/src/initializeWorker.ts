import _ from 'lodash';
import { CharacterInputSchema } from './templates/character/CharacterInputSchema';
import { CharacterStateSchema } from './templates/character/CharacterStateSchema';
import { DefaultNetworkSchema } from './templates/networking/DefaultNetworkSchema';
import { ClientNetworkSystem } from './networking/systems/ClientNetworkSystem';
import { registerSystem } from './ecs/functions/SystemFunctions';
import { createWorker, WorkerProxy } from './worker/MessageQueue';
import { createCanvas } from './renderer/functions/createCanvas';
import { EngineMessageType, EngineProxy } from './EngineProxy'
import { Engine } from './ecs/classes/Engine';
import { Timer } from './common/functions/Timer';
import { execute, initialize } from "./ecs/functions/EngineFunctions";
import { SystemUpdateType } from "./ecs/functions/SystemUpdateType";
import { MediaStreamSystem } from './networking/systems/MediaStreamSystem';
import { InputSystem } from './input/systems/ClientInputSystem';

const isSafari = typeof navigator !== 'undefined' && /Version\/[\d\.]+.*Safari/.test(window.navigator.userAgent);

export const DefaultInitializationOptions = {
  input: {
    schema: CharacterInputSchema,
    useWebXR: !isSafari,
  },
  networking: {
    schema: DefaultNetworkSchema
  },
  state: {
    schema: CharacterStateSchema
  },
};

class WorkerEngineProxy {

  static instance: WorkerEngineProxy;

  workerProxy: WorkerProxy;
  constructor(workerProxy: WorkerProxy) {
    WorkerEngineProxy.instance = this;
    this.workerProxy = workerProxy;
  }

  loadScene(result) {
    this.workerProxy.sendEvent(EngineMessageType.ENGINE_CALL, { type: 'loadScene', detail: [result] });
  }
  transferNetworkBuffer(buffer, delta) {
    this.workerProxy.sendEvent(EngineMessageType.ENGINE_CALL, { type: 'transferNetworkBuffer', detail: [buffer, delta] }, [buffer]);
  }
  
}

export async function initializeWorker(initOptions: any = DefaultInitializationOptions): Promise<void> {
  const options = _.defaultsDeep({}, initOptions, DefaultInitializationOptions);

  const networkSystemOptions = { schema: options.networking.schema, app: options.networking.app };
  registerSystem(ClientNetworkSystem, { ...networkSystemOptions, priority: -1 });
  registerSystem(MediaStreamSystem);
  registerSystem(InputSystem, { useWebXR: DefaultInitializationOptions.input.useWebXR });
  // console.log(new URL('./entry.worker.ts', import.meta.url))

  const workerProxy = await createWorker(
    new URL('./entry.worker.ts', import.meta.url),
    (options.renderer.canvas || createCanvas()),
    {}
  );
  const workerEngineProxy = new WorkerEngineProxy(workerProxy);
  EngineProxy.instance = workerEngineProxy;

  // Start our timer!
  Engine.engineTimerTimeout = setTimeout(() => {
    Engine.engineTimer = Timer(
      {
        networkUpdate: (delta:number, elapsedTime: number) => execute(delta, elapsedTime, SystemUpdateType.Network),
        fixedUpdate: (delta:number, elapsedTime: number) => execute(delta, elapsedTime, SystemUpdateType.Fixed),
        update: (delta, elapsedTime) => execute(delta, elapsedTime, SystemUpdateType.Free)
      }, Engine.physicsFrameRate, Engine.networkFramerate).start();
  }, 1000);
}
