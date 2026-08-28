import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ChevronRight, Radio} from 'lucide-react-native';
import {NativePressable} from './NativePressable';
import {colors, radii} from '../theme';

export function IntegrationsShortcutRow({onPress}:{onPress:()=>void}) {
  return (
    <NativePressable haptic onPress={onPress} style={styles.row}>
      <View style={styles.inner}>
        <View style={styles.icon}><Radio size={20} color={colors.blue}/></View>
        <Text style={styles.label}>Integrações</Text>
        <ChevronRight size={19} color={colors.faint}/>
      </View>
    </NativePressable>
  );
}
const styles=StyleSheet.create({
  row:{minHeight:58,marginBottom:9},
  inner:{minHeight:58,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,borderRadius:radii.lg,backgroundColor:colors.panel},
  icon:{width:34,height:34,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:colors.panel2},
  label:{flex:1,color:colors.text,fontSize:13,fontWeight:'700'},
});
