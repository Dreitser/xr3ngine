import { Behavior } from '@xr3ngine/engine/src/common/interfaces/Behavior';
import { Entity } from '../../../ecs/classes/Entity';
import { getComponent } from '../../../ecs/functions/EntityFunctions';
import { setState } from "../../../state/behaviors/setState";
import { CharacterComponent } from '../components/CharacterComponent';

export const onAnimationEnded: Behavior = (entity: Entity, args: { transitionToState: any }, deltaTime) => {
  const actor = getComponent<CharacterComponent>(entity, CharacterComponent as any);
  if(!actor.initialized) return console.warn("Actor not initialized");
  if (actor.timer > actor.currentAnimationLength - deltaTime) {
  //  console.log('animation ended! (', actor.currentAnimationLength, ')', now(),', switch to ', args.transitionToState)
    setState(entity, { state: args.transitionToState });
  }
};
