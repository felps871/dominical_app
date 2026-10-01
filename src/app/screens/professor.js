import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ProfessorScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.h1}>Painel do Professor</Text>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitulo}>📚 Turma: Dev. de Sistemas</Text>
            <Text style={styles.cardSub}>Alunos Matriculados: 30</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Voltar / Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20 },
  h1: { fontSize: 30, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  cardInfo: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 16, marginVertical: 8, width: '90%' },
  cardTitulo: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  cardSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 12, marginTop: 20, width: '80%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});