import { SystemAttributes, System } from '../../ecs/classes/System';
import { Engine } from '../../ecs/classes/Engine';
import { MediaStreamComponent } from '../components/MediaStreamComponent';
import { Network } from '../components/Network';
import { localMediaConstraints } from '../constants/VideoConstants';
import { getEntityByName, addComponent, getMutableComponent } from '../../ecs/functions/EntityFunctions';

export class MediaStreamSystem extends System {
  public static instance: MediaStreamSystem = null
  init (attributes?:SystemAttributess): void {
    const networkEntity = getEntityByName('network');
    addComponent(networkEntity, MediaStreamComponent);
    const mediaStreamComponent = getMutableComponent<MediaStreamComponent>(networkEntity, MediaStreamComponent);
    MediaStreamComponent.instance = mediaStreamComponent;
  }

  constructor (world: Engine) {
    super(world);
    MediaStreamSystem.instance = this;
    // Do this next tickSphe so singleton can init
    // TODO:
    // Maybe replace this or expose camera permissreion explicitly so user can handle
    setTimeout(() => this.startCamera(), 1);
  }

  public execute () {
    // eh
  }

  async startCamera (): Promise<boolean> {
    if (MediaStreamComponent.instance.mediaStream) return false;
    console.log('start camera');
    return await this.getMediaStream();
  }

  // switch to sending video from the "next" camera device in our device
  // list (if we have multiple cameras)
  async cycleCamera (): Promise<boolean> {
    if (!(MediaStreamComponent.instance.camVideoProducer && MediaStreamComponent.instance.camVideoProducer.track)) {
      console.log('cannot cycle camera - no current camera track');
      return false;
    }
    console.log('cycle camera');

    // find "next" device in device list
    const deviceId = await this.getCurrentDeviceId();
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const vidDevices = allDevices.filter(d => d.kind === 'videoinput');
    if (!(vidDevices.length > 1)) {
      console.log('cannot cycle camera - only one camera');
      return false;
    }
    let idx = vidDevices.findIndex(d => d.deviceId === deviceId);
    if (idx === vidDevices.length - 1) idx = 0;
    else idx += 1;

    // get a new video stream. might as well get a new audio stream too,
    // just in case browsers want to group audio/video streams together
    // from the same device when possible (though they don't seem to,
    // currently)
    console.log('getting a video stream from new device', vidDevices[idx].label);
    MediaStreamComponent.instance.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: vidDevices[idx].deviceId } },
      audio: true
    });

    // replace the tracks we are sending
    await MediaStreamComponent.instance.camVideoProducer.replaceTrack({
      track: MediaStreamComponent.instance.mediaStream.getVideoTracks()[0]
    });
    await MediaStreamComponent.instance.camAudioProducer.replaceTrack({
      track: MediaStreamComponent.instance.mediaStream.getAudioTracks()[0]
    });
    return true;
  }

  // -- user interface --
  getScreenPausedState () {
    return MediaStreamComponent.instance.screenShareVideoPaused;
  }

  getScreenAudioPausedState () {
    return MediaStreamComponent.instance.screenShareAudioPaused;
  }

  async toggleWebcamVideoPauseState () {
    const videoPaused = MediaStreamComponent.instance.toggleVideoPaused();
    if (videoPaused) (Network.instance.transport as any).pauseProducer(MediaStreamComponent.instance.camVideoProducer);
    else (Network.instance.transport as any).resumeProducer(MediaStreamComponent.instance.camVideoProducer);
  }

  async toggleWebcamAudioPauseState () {
    const audioPaused = MediaStreamComponent.instance.toggleAudioPaused();
    if (audioPaused) (Network.instance.transport as any).resumeProducer(MediaStreamComponent.instance.camAudioProducer);
    else (Network.instance.transport as any).pauseProducer(MediaStreamComponent.instance.camAudioProducer);
  }

  async toggleScreenshareVideoPauseState () {
    if (this.getScreenPausedState()) { (Network.instance.transport as any).pauseProducer(MediaStreamComponent.instance.screenVideoProducer); } else (Network.instance.transport as any).resumeProducer(MediaStreamComponent.instance.screenVideoProducer);
    MediaStreamComponent.instance.screenShareVideoPaused = !MediaStreamComponent.instance.screenShareVideoPaused;
  }

  async toggleScreenshareAudioPauseState () {
    if (this.getScreenAudioPausedState()) { (Network.instance.transport as any).pauseProducer(MediaStreamComponent.instance.screenAudioProducer); } else (Network.instance.transport as any).resumeProducer(MediaStreamComponent.instance.screenAudioProducer);
    MediaStreamComponent.instance.screenShareAudioPaused = !MediaStreamComponent.instance.screenShareAudioPaused;
  }

  removeVideoAudio (consumer: any) {
    document.querySelectorAll(consumer.id).forEach(v => {
      if (v.consumer === consumer) v.parentNode.removeChild(v);
    });
  }

  addVideoAudio (consumer: { track: { clone: () => MediaStreamTrack }, kind: string }, peerId: any) {
    if (!(consumer && consumer.track)) {
      return;
    }
    const elementID = `${peerId}_${consumer.kind}`;
    let el = document.getElementById(elementID);

    // set some attributes on our audio and video elements to make
    // mobile Safari happy. note that for audio to play you need to be
    // capturing from the mic/camera
    if (consumer.kind === 'video') {
      console.log('Creating video element with ID ' + elementID);
      if (el === null) {
        console.log(`Creating video element for user with ID: ${peerId}`);
        el = document.createElement('video');
        el.id = `${peerId}_${consumer.kind}`;
        el.autoplay = true;
        document.body.appendChild(el);
        el.setAttribute('playsinline', 'true');
      }

      // TODO: do i need to update video width and height? or is that based on stream...?
      console.log(`Updating video source for user with ID: ${peerId}`);
      el.srcObject = new MediaStream([consumer.track.clone()]);
      el.consumer = consumer;

      // let's "yield" and return before playing, rather than awaiting on
      // play() succeeding. play() will not succeed on a producer-paused
      // track until the producer unpauses.
      el.play().catch((e: any) => {
        console.log(`Play video error: ${e}`);
        console.error(e);
      });
    } else {
      // Positional Audio Works in Firefox:
      // Global Audio:
      if (el === null) {
        console.log(`Creating audio element for user with ID: ${peerId}`);
        el = document.createElement('audio');
        el.id = `${peerId}_${consumer.kind}`;
        document.body.appendChild(el);
        el.setAttribute('playsinline', 'true');
        el.setAttribute('autoplay', 'true');
      }

      console.log(`Updating <audio> source object for client with ID: ${peerId}`);
      el.srcObject = new MediaStream([consumer.track.clone()]);
      el.consumer = consumer;
      el.volume = 0; // start at 0 and let the three.js scene take over from here...
      // this.worldScene.createOrUpdatePositionalAudio(peerId)

      // let's "yield" and return before playing, rather than awaiting on
      // play() succeeding. play() will not succeed on a producer-paused
      // track until the producer unpauses.
      el.play().catch((e: any) => {
        console.log(`Play audio error: ${e}`);
        console.error(e);
      });
    }
  }

  async getCurrentDeviceId () {
    if (!MediaStreamComponent.instance.camVideoProducer) return null;

    const { deviceId } = MediaStreamComponent.instance.camVideoProducer.track.getSettings();
    if (deviceId) return deviceId;
    // Firefox doesn't have deviceId in MediaTrackSettings object
    const track =
      MediaStreamComponent.instance.mediaStream && MediaStreamComponent.instance.mediaStream.getVideoTracks()[0];
    if (!track) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const deviceInfo = devices.find(d => d.label.startsWith(track.label));
    return deviceInfo.deviceId;
  }

  public async getMediaStream (): Promise<boolean> {
    MediaStreamComponent.instance.mediaStream = await navigator.mediaDevices.getUserMedia(localMediaConstraints);
    if (MediaStreamComponent.instance.mediaStream.active) {
      MediaStreamComponent.instance.audioPaused = false;
      MediaStreamComponent.instance.videoPaused = false;
      return true;
    }
    MediaStreamComponent.instance.audioPaused = true;
    MediaStreamComponent.instance.videoPaused = true;
    return false;
  }
}