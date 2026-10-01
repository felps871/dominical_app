import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const nomeUsuario = params.userName || 'Professor';

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header com Boas-Vindas */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {getSaudacao()}, {nomeUsuario}!
          </Text>
          <Text style={styles.headerTitle}>Gestão EBD 📖</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <Ionicons name="person-circle-outline" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner de Lançamento do Domingo (Apenas Iniciar Chamada) */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardBadge}>
            <Text style={styles.mainCardBadgeText}>HOJE</Text>
          </View>
          <Text style={styles.mainCardTitle}>Lançamento do Domingo</Text>
          <Text style={styles.mainCardSub}>
            Registre a frequência e o controle de presença dos alunos da classe.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/chamada')}
          >
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Iniciar Chamada</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Painel da EBD</Text>

        {/* Grelha de Módulos EBD */}
        <View style={styles.gridContainer}>
          {/* Módulo: Assiduidade / Ranking */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/assiduidade')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.gridTitle}>Assiduidade</Text>
            <Text style={styles.gridSub}>Ranking sem faltas</Text>
          </TouchableOpacity>

          {/* Módulo: Classes */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/classes')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="school-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.gridTitle}>Classes</Text>
            <Text style={styles.gridSub}>Gestão de turmas</Text>
          </TouchableOpacity>

          {/* Módulo: Alunos Ausentes / Evadidos */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/ausentes')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
            </View>
            <Text style={styles.gridTitle}>Ausentes</Text>
            <Text style={styles.gridSub}>Controle de visitas</Text>
          </TouchableOpacity>

          {/* Módulo: Relatórios de Presença */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => router.push('/relatorios')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="document-text-outline" size={24} color="#16A34A" />
            </View>
            <Text style={styles.gridTitle}>Relatórios</Text>
            <Text style={styles.gridSub}>Emissão de dados</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#0F172A',
    padding: 20,
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  profileBtn: { padding: 4 },
  content: { padding: 16 },
  mainCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  mainCardBadge: {
    backgroundColor: '#16A34A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  mainCardBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  mainCardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mainCardSub: { color: '#94A3B8', fontSize: 13, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    padding: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justify: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: '#FFF',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justify: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  gridSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
});