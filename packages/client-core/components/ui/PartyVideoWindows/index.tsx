import React, { useState, useEffect } from 'react';
// @ts-ignore
import styles from './PartyVideoWindows.module.scss';
import { Grid } from '@material-ui/core';
import PartyParticipantWindow from '../PartyParticipantWindow';
import { observer } from 'mobx-react';
import { selectAuthState } from "../../../redux/auth/selector";
import { selectUserState } from "../../../redux/user/selector";
import {connect} from "react-redux";
import {Network} from "@xr3ngine/engine/src/networking/classes/Network";
import {bindActionCreators, Dispatch} from "redux";
import {
  getLayerUsers
} from "../../../redux/user/service";

interface Props {
  authState?: any;
  userState?: any;
  getLayerUsers?: any;
}

const mapStateToProps = (state: any): any => {
  return {
    authState: selectAuthState(state),
    userState: selectUserState(state)
  };
};


const mapDispatchToProps = (dispatch: Dispatch): any => ({
  getLayerUsers: bindActionCreators(getLayerUsers, dispatch)
});

const PartyVideoWindows = observer((props: Props): JSX.Element => {
  const {
    authState,
    userState,
    getLayerUsers
  } = props;

  const [displayedUsers, setDisplayedUsers] = useState([]);
  const selfUser = authState.get('user');
  const layerUsers = userState.get('layerUsers') ?? [];
  const channelLayerUsers = userState.get('channelLayerUsers') ?? [];

  useEffect(() => {
    console.log('transport channelType:', (Network.instance?.transport as any)?.channelType);
    if ((Network.instance?.transport as any)?.channelType === 'channel') setDisplayedUsers(channelLayerUsers.filter((user) => user.id !== selfUser.id));
    else setDisplayedUsers(layerUsers.filter((user) => user.id !== selfUser.id))
    console.log('displayedUsers:');
    console.log(displayedUsers);
  }, [layerUsers, channelLayerUsers]);

  useEffect(() => {
    if (selfUser.instanceId != null && userState.get('layerUsersUpdateNeeded') === true) getLayerUsers(true);
    if (selfUser.channelInstanceId != null && userState.get('channelLayerUsersUpdateNeeded') === true) getLayerUsers(false);
  }, [ userState]);

  return (
    <>
      { displayedUsers.map((user) => (
        <PartyParticipantWindow
            peerId={user.id}
            key={user.id}
        />
      ))}
      </>
  );
});

export default connect(mapStateToProps, mapDispatchToProps)(PartyVideoWindows);
