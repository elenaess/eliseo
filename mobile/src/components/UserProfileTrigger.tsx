import React, {ReactNode, useState} from 'react';
import {Pressable, StyleProp, ViewStyle} from 'react-native';
import {auth} from '../services/firebase';
import {UserProfileSheet} from './UserProfileSheet';

export function canOpenUserProfile(targetUid: string, currentUid: string) {
  return !!targetUid && targetUid !== currentUid;
}

export function UserProfileTrigger({
  uid,
  children,
  style,
}: {
  uid: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const currentUid = auth.currentUser?.uid ?? '';
  const enabled = canOpenUserProfile(uid, currentUid);

  return (
    <>
      <Pressable
        disabled={!enabled}
        onPress={() => setOpen(true)}
        style={style}
      >
        {children}
      </Pressable>
      <UserProfileSheet uid={enabled ? uid : null} visible={open && enabled} onClose={() => setOpen(false)} />
    </>
  );
}
