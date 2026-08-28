import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import Pdf from 'react-native-pdf';
import {Reader, ReaderProvider} from '@epubjs-react-native/core';
import {useFileSystem} from '@epubjs-react-native/file-system';
import {ArrowLeft, Star} from 'lucide-react-native';

import {NativePressable} from '../components/NativePressable';
import {auth} from '../services/firebase';
import {LibraryFavorite, listenToLibraryFavorites, setLibraryFavorite} from '../services/library';
import {colors} from '../theme';
import type {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BookReader'>;

function ReaderContent({navigation, route}: Props) {
  const uid = auth.currentUser?.uid ?? '';
  const {url, format, book} = route.params;
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) return;
    return listenToLibraryFavorites(uid, (items: LibraryFavorite[]) => {
      setFavorite(items.some(item => item.key === book.key));
    });
  }, [uid, book.key]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <NativePressable haptic onPress={() => navigation.goBack()} style={styles.headerButton}>
          <View style={styles.headerInner}><ArrowLeft size={22} color={colors.text}/></View>
        </NativePressable>
        <Text numberOfLines={1} style={styles.title}>{route.params.title}</Text>
        <NativePressable haptic onPress={() => void setLibraryFavorite(uid, book, !favorite)} style={styles.headerButton}>
          <View style={styles.headerInner}><Star size={21} color={favorite ? '#F2B94B' : colors.textSoft} fill={favorite ? '#F2B94B' : 'transparent'}/></View>
        </NativePressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.reader}>
        {format === 'pdf' ? (
          <Pdf
            source={{uri: url, cache: false}}
            style={styles.pdf}
            trustAllCerts={false}
            enablePaging={false}
            horizontal={false}
            onError={caught => setError(String(caught))}
            renderActivityIndicator={() => <ActivityIndicator size="small" color={colors.blue}/>}
          />
        ) : (
          <Reader
            src={url}
            fileSystem={useFileSystem}
            onReady={() => setError('')}
          />
        )}
      </View>
    </View>
  );
}

export function BookReaderScreen(props: Props) {
  return <ReaderProvider><ReaderContent {...props}/></ReaderProvider>;
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  headerButton: {width: 46, height: 46},
  headerInner: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, color: colors.textSoft, fontSize: 12, fontWeight: '700', textAlign: 'center'},
  reader: {flex: 1},
  pdf: {flex: 1, backgroundColor: colors.bg},
  error: {padding: 10, color: colors.red, fontSize: 10, textAlign: 'center'},
});
