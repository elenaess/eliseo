import React, {useEffect, useState} from 'react';
import {Linking, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ArrowLeft, Check, Music2, Radio} from 'lucide-react-native';
import {NativePressable} from '../components/NativePressable';
import {auth, listenToUserProfile} from '../services/firebase';
import {
  beginSpotifyAuthorization,
  disconnectSpotify,
  handleSpotifyCallback,
  hasLocalMusicAccess,
  MusicProvider,
  openLocalMusicAccessSettings,
  setMusicProvider,
  spotifyConfigured,
} from '../services/music';
import {colors, radii} from '../theme';
import type {RootStackParamList} from '../types/navigation';

type Props=NativeStackScreenProps<RootStackParamList,'Integrations'>;
const options:Array<{value:MusicProvider;title:string;description:string}>=[
  {value:null,title:'Nenhum',description:'Não publicar atividade musical.'},
  {value:'spotify',title:'Spotify',description:'Usa a conta Spotify via OAuth PKCE.'},
  {value:'youtube_music',title:'YouTube Music',description:'Lê a sessão de mídia deste Android.'},
  {value:'qobuz',title:'Qobuz',description:'Lê a sessão de mídia deste Android.'},
];

export function IntegrationsScreen({navigation}:Props){
  const uid=auth.currentUser?.uid??'';
  const [provider,setProvider]=useState<MusicProvider>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>uid?listenToUserProfile(uid,p=>setProvider(p?.musicProvider??null)):undefined,[uid]);
  useEffect(()=>{
    const handler=async({url}:{url:string})=>{
      try{
        if(await handleSpotifyCallback(url)){
          await setMusicProvider(uid,'spotify');
          setMessage('Spotify conectado.');
        }
      }catch(caught){setMessage(caught instanceof Error?caught.message:'Falha no Spotify.');}
    };
    const sub=Linking.addEventListener('url',handler);
    Linking.getInitialURL().then(url=>{if(url)void handler({url});});
    return()=>sub.remove();
  },[uid]);

  async function choose(next:MusicProvider){
    if(!uid||busy)return;
    try{
      setBusy(true);setMessage('');
      if(next==='spotify'){
        if(!spotifyConfigured()) throw new Error('Configure o Client ID do Spotify no Patch 3B.');
        await beginSpotifyAuthorization();
        return;
      }
      if(next==='youtube_music'||next==='qobuz'){
        if(!(await hasLocalMusicAccess())){
          setMessage('Ative “Acesso a notificações” para o Elíseo e volte aqui.');
          await openLocalMusicAccessSettings();
          return;
        }
      }
      if(provider==='spotify')await disconnectSpotify();
      await setMusicProvider(uid,next);
    }catch(caught){setMessage(caught instanceof Error?caught.message:'Não foi possível salvar.');}
    finally{setBusy(false);}
  }

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <NativePressable haptic onPress={()=>navigation.goBack()} style={styles.back}><View style={styles.backInner}><ArrowLeft size={20} color={colors.textSoft}/></View></NativePressable>
      <View><Text style={styles.title}>Integrações</Text><Text style={styles.subtitle}>Escolha uma fonte para atividade musical.</Text></View>
    </View>
    <View style={styles.info}><Radio size={18} color={colors.blue}/><Text style={styles.infoText}>Somente uma fonte fica ativa por vez. YouTube Music e Qobuz usam a sessão de mídia local do Android.</Text></View>
    {options.map(option=>{
      const active=provider===option.value;
      return <NativePressable key={option.title} haptic disabled={busy} onPress={()=>void choose(option.value)} style={styles.option}>
        <View style={styles.optionInner}><View style={styles.icon}><Music2 size={19} color={active?colors.blue:colors.textSoft}/></View><View style={styles.text}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.description}>{option.description}</Text></View>{active&&<Check size={19} color={colors.blue}/>}</View>
      </NativePressable>;
    })}
    {!!message&&<Text style={styles.message}>{message}</Text>}
  </ScrollView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},content:{padding:18,paddingTop:40,paddingBottom:40},header:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},back:{width:42,height:42},backInner:{flex:1,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:colors.panel2},title:{color:colors.text,fontSize:20,fontWeight:'800'},subtitle:{marginTop:3,color:colors.muted,fontSize:10},info:{flexDirection:'row',gap:10,padding:13,marginBottom:14,borderRadius:radii.lg,backgroundColor:colors.panel2},infoText:{flex:1,color:colors.textSoft,fontSize:10,lineHeight:15},option:{minHeight:68,marginBottom:9},optionInner:{flex:1,flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:13,borderRadius:radii.lg,backgroundColor:colors.panel},icon:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:colors.panel2},text:{flex:1},optionTitle:{color:colors.text,fontSize:13,fontWeight:'800'},description:{marginTop:3,color:colors.muted,fontSize:9.5},message:{marginTop:8,color:colors.textSoft,fontSize:10,textAlign:'center'}});
