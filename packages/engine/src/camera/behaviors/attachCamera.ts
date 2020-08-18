import { Behavior } from '../../common/interfaces/Behavior';
import { Entity } from '../../ecs/classes/Entity';
import { CameraComponent } from '../components/CameraComponent';

export const attachCamera: Behavior = (entity: Entity): void => {
  CameraComponent.instance.followTarget = entity;
};