import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChamadaScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>📋 Iniciar Chamada</Text>
      <Text style={styles.sub}>Aqui será feita a chamada do domingo.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  sub: { color: '#64748B', marginTop: 8 }
});