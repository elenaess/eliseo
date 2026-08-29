// ELISEO_PATCH2_PROFILE_MOTION: movimento curto, sem spring/zoom explosivo.
import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Animated, {FadeIn, FadeOut, SlideInDown, SlideOutDown} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {X} from 'lucide-react-native';

import {Avatar} from './Avatar';
import {MusicActivityCard} from './MusicActivityCard';

import {NativePressable} from './NativePressable';
import {StatusDot, normalizeEliseoStatus} from './StatusDot';
import {EliseoUser, listenToUserProfile} from '../services/firebase';
import {colors, radii} from '../theme';

export function UserProfileSheet({
  uid,
  visible,
  onClose,
}: {
  uid: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<EliseoUser | null>(null);

  useEffect(() => {
    if (!visible || !uid) {
      setProfile(null);
      return;
    }
    return listenToUserProfile(uid, setProfile);
  }, [uid, visible]);

  const displayName = useMemo(
    () => profile?.username || profile?.email?.split('@')[0] || 'Usuário',
    [profile],
  );
  const status = normalizeEliseoStatus(profile?.status);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(130)} style={styles.backdrop}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={18}
          reducedTransparencyFallbackColor="rgba(0,0,0,0.78)"
        />
        <NativePressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <View style={StyleSheet.absoluteFill} />
        </NativePressable>

        <Animated.View entering={SlideInDown.duration(240)} exiting={SlideOutDown.duration(170)} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.bannerWrap}>
            {profile?.banner ? (
              <Image source={{uri: profile.banner}} resizeMode="cover" style={styles.banner} />
            ) : (
              <LinearGradient colors={['#173158', '#0C1729']} style={styles.banner} />
            )}
            <NativePressable haptic onPress={onClose} style={styles.close}>
              <View style={styles.closeInner}>
                <X size={18} color={colors.white} />
              </View>
            </NativePressable>
          </View>

          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              <Avatar name={displayName} uri={profile?.avatar} accent={colors.blue} size={82} />
              <View style={styles.statusPos}>
                <StatusDot status={status} size={18} />
              </View>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            {!!(profile?.course || profile?.institutionTag || profile?.institutionName) && (
              <View style={styles.academic}>
                {!!profile?.course && <Text style={styles.course}>{profile.course}</Text>}
                {!!(profile?.institutionTag || profile?.institutionName) && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{profile.institutionTag || profile.institutionName}</Text>
                  </View>
                )}
              </View>
            )}

            {/* ELISEO_MUSIC_ACTIVITY_SLOT */}
            <View style={{width: '100%', marginTop: 16}}>
              <MusicActivityCard activity={profile?.musicActivity} />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)'},
  sheet: {
    minHeight: '50%',
    maxHeight: '72%',
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.bg,
  },
  handle: {alignSelf: 'center', width: 38, height: 4, marginTop: 9, marginBottom: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.24)', zIndex: 3},
  bannerWrap: {height: 118, overflow: 'hidden'},
  banner: {...StyleSheet.absoluteFill, width: undefined, height: undefined},
  close: {position: 'absolute', top: 10, right: 12, width: 36, height: 36},
  closeInner: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.42)'},
  identity: {alignItems: 'center', paddingHorizontal: 22, paddingBottom: 30},
  avatarWrap: {marginTop: -42, borderRadius: 44, borderWidth: 3, borderColor: colors.bg},
  statusPos: {position: 'absolute', right: 2, bottom: 4},
  name: {marginTop: 10, color: colors.text, fontSize: 20, fontWeight: '800'},
  bio: {marginTop: 7, color: colors.textSoft, fontSize: 12, lineHeight: 17, textAlign: 'center'},
  academic: {marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6},
  course: {color: colors.textSoft, fontSize: 11, fontWeight: '700'},
  badge: {minHeight: 26, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.panel2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
  badgeText: {color: colors.text, fontSize: 10, fontWeight: '800'},
});
