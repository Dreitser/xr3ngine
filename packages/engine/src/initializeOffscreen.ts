import _ from 'lodash';
import { AudioListener, BufferGeometry, Mesh, PerspectiveCamera, Scene } from 'three';
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";
import AssetLoadingSystem from './assets/systems/AssetLoadingSystem';
// import { PositionalAudioSystem } from './audio/systems/PositionalAudioSystem';
import { CameraSystem } from './camera/systems/CameraSystem';
import { Timer } from './common/functions/Timer';
import { DebugHelpersSystem } from './debug/systems/DebugHelpersSystem';
import { Engine } from './ecs/classes/Engine';
import { execute, initialize } from "./ecs/functions/EngineFunctions";
import { registerSystem } from './ecs/functions/SystemFunctions';
import { SystemUpdateType } from "./ecs/functions/SystemUpdateType";
import { EngineMessageType, EngineProxy } from './EngineProxy';
import { InputSystem } from './input/systems/ClientInputSystem';
import { InteractiveSystem } from "./interaction/systems/InteractiveSystem";
import { applyNetworkStateToClient } from './networking/functions/applyNetworkStateToClient';
import { WorldStateModel } from './networking/schema/worldStateSchema';
// import { ClientNetworkSystem } from './networking/systems/ClientNetworkSystem';
// import { MediaStreamSystem } from './networking/systems/MediaStreamSystem';
// import { ServerNetworkIncomingSystem } from './networking/systems/ServerNetworkIncomingSystem';
// import { ServerNetworkOutgoingSystem } from './networking/systems/ServerNetworkOutgoingSystem';
import { ParticleSystem } from './particles/systems/ParticleSystem';
import { PhysicsSystem } from './physics/systems/PhysicsSystem';
import { createCanvas } from './renderer/functions/createCanvas';
import { HighlightSystem } from './renderer/HighlightSystem';
import { WebGLRendererSystem } from './renderer/WebGLRendererSystem';
import { loadScene } from './scene/functions/SceneLoading';
import { ServerSpawnSystem } from './scene/systems/SpawnSystem';
import { StateSystem } from './state/systems/StateSystem';
import { CharacterInputSchema } from './templates/character/CharacterInputSchema';
import { CharacterStateSchema } from './templates/character/CharacterStateSchema';
import { DefaultNetworkSchema } from './templates/networking/DefaultNetworkSchema';
import { TransformSystem } from './transform/systems/TransformSystem';
import { MainProxy } from './worker/MessageQueue';

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype["computeBoundsTree"] = computeBoundsTree;

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

class ReceiveEngineProxy {
  mainProxy: MainProxy;
  constructor(proxy: MainProxy) {
    this.mainProxy = proxy;
  }

  loadScene(result) {
    loadScene(result);
  }
  transferNetworkBuffer(buffer, delta) {
    const unbufferedState = WorldStateModel.fromBuffer(buffer);
    if(!unbufferedState) console.warn("Couldn't deserialize buffer, probably still reading the wrong one")
    if(unbufferedState) applyNetworkStateToClient(unbufferedState, delta);
  }
  
}


export function initializeEngineOffscreen(initOptions: any = DefaultInitializationOptions, mainProxy: MainProxy): void {
  const options = _.defaultsDeep({}, initOptions, DefaultInitializationOptions);

  EngineProxy.instance = new ReceiveEngineProxy(mainProxy);
  mainProxy.addEventListener(EngineMessageType.ENGINE_CALL, (ev: CustomEvent) => {
    console.log('WORKER EVENT: ', ev)
    if(typeof EngineProxy.instance[ev.type] === 'function') {
      EngineProxy.instance[ev.type](...ev.detail);
    }
  })

  initialize();
  Engine.scene = new Scene();

  (window as any).engine = Engine;
  // (window as any).iOS = !window.MSStream && /iPad|iPhone|iPod/.test(navigator.userAgent);
  // (window as any).safariWebBrowser = !window.MSStream && /Safari/.test(navigator.userAgent);

  // Networking
  const networkSystemOptions = { schema: options.networking.schema, app: options.networking.app };
  // registerSystem(ClientNetworkSystem, { ...networkSystemOptions, priority: -1 });

  // Do we want audio and video streams?
  // registerSystem(MediaStreamSystem);

  registerSystem(AssetLoadingSystem);

  registerSystem(PhysicsSystem);

  // registerSystem(InputSystem, { useWebXR: DefaultInitializationOptions.input.useWebXR });

  registerSystem(StateSystem);

  registerSystem(ServerSpawnSystem, { priority: 899 });

  registerSystem(TransformSystem, { priority: 900 });

  Engine.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 750);
  Engine.scene.add(Engine.camera);

//  const listener = new AudioListener();
//  camera.add( listener);

//  Engine.audioListener = listener;

  registerSystem(HighlightSystem);
//  registerSystem(PositionalAudioSystem);
  registerSystem(InteractiveSystem);
  registerSystem(ParticleSystem);
  if (process.env.NODE_ENV === 'development') {
    registerSystem(DebugHelpersSystem);
  }
  registerSystem(CameraSystem);
  registerSystem(WebGLRendererSystem, { priority: 1001, canvas: options.renderer.canvas || createCanvas() });
  Engine.viewportElement = Engine.renderer.domElement;

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
