import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {Music2} from 'lucide-react-native';
import {MusicActivity, isRecentMusicActivity} from '../services/music';
import {colors, radii} from '../theme';

function time(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicActivityCard({activity}: {activity?: MusicActivity | null}) {
  if (!isRecentMusicActivity(activity) || !activity) return null;
  const progress = activity.durationMs > 0 ? Math.min(100, Math.max(0, activity.positionMs / activity.durationMs * 100)) : 0;
  const provider = activity.provider === 'spotify' ? 'Spotify' : activity.provider === 'youtube_music' ? 'YouTube Music' : 'Qobuz';
  return (
    <View style={styles.card}>
      <View style={styles.artwork}>
        {activity.artworkUrl ? <Image source={{uri: activity.artworkUrl}} resizeMode="cover" style={styles.image}/> : <Music2 size={24} color={colors.blue}/>}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>{activity.title}</Text>
        <Text numberOfLines={1} style={styles.artist}>{activity.artist || provider}</Text>
        <View style={styles.progress}><View style={[styles.fill,{width:`${progress}%` as `${number}%`}]} /></View>
        <View style={styles.meta}><Text style={styles.provider}>{provider}</Text><Text style={styles.duration}>{time(activity.positionMs)} / {time(activity.durationMs)}</Text></View>
      </View>
    </View>
  );
}

const styles=StyleSheet.create({
  card:{width:'100%',minHeight:82,flexDirection:'row',gap:11,padding:10,borderRadius:radii.lg,backgroundColor:colors.panel,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border},
  artwork:{width:60,height:60,overflow:'hidden',alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:colors.panel2},
  image:{...StyleSheet.absoluteFill,width:undefined,height:undefined},
  body:{flex:1,justifyContent:'center'},
  title:{color:colors.text,fontSize:12,fontWeight:'800'},
  artist:{marginTop:2,color:colors.muted,fontSize:9.5},
  progress:{height:3,marginTop:9,overflow:'hidden',borderRadius:2,backgroundColor:colors.panel3},
  fill:{height:'100%',borderRadius:2,backgroundColor:colors.blue},
  meta:{marginTop:5,flexDirection:'row',justifyContent:'space-between'},
  provider:{color:colors.faint,fontSize:8,fontWeight:'700'},
  duration:{color:colors.faint,fontSize:8},
});
