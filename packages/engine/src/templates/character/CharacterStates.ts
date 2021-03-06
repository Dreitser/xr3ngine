import { CharacterStateTypes } from './CharacterStateTypes';
import { MovingState } from "./states/MovingState";
import { DrivingState } from './states/DrivingState';
import { DropRunningState } from './states/DropState';
import { EnterVehicleState } from './states/EnterVehicleState';
import { ExitVehicleState } from './states/ExitVehicleState';
import { FallingState } from './states/FallingState';
import { JumpState } from './states/JumpState';

export const CharacterStates = {
  [CharacterStateTypes.DROP]: DropRunningState,
  [CharacterStateTypes.FALLING]: FallingState,
  [CharacterStateTypes.DEFAULT]: MovingState,
  [CharacterStateTypes.JUMP]: JumpState,
  [CharacterStateTypes.DRIVING]: DrivingState,
  [CharacterStateTypes.ENTERING_VEHICLE]: EnterVehicleState,
  [CharacterStateTypes.EXITING_VEHICLE]: ExitVehicleState
};
