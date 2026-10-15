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
import { useTheme } from '../../context/ThemeContext'; // Ajuste o caminho até o seu ThemeContext caso necessário

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const nomeUsuario = params.userName || 'Superintendente';

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* Header com Boas-Vindas e Botão de Alternar Tema */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <View>
          <Text style={styles.headerSubtitle}>
            {getSaudacao()}, {nomeUsuario}!
          </Text>
          <Text style={styles.headerTitle}>Gestão EBD 📖</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeButton,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={20}
              color={isDarkMode ? '#F59E0B' : '#6366F1'}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner de Lançamento do Domingo */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
              borderColor: theme.border,
              borderWidth: isDarkMode ? 0 : 1,
            },
          ]}
        >
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Painel da EBD</Text>

        {/* Grelha de Módulos EBD */}
        <View style={styles.gridContainer}>
          {/* Módulo: Escala de Professores (Superintendente) */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/escala-professores')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="calendar-outline" size={24} color="#4F46E5" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Escala Trimestral</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Gerar rodízio automático</Text>
          </TouchableOpacity>

          {/* Módulo: Cadastrar Lição */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/cadastrar-licao')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="book-outline" size={24} color="#7C3AED" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Cadastrar Lição</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Agenda e professores</Text>
          </TouchableOpacity>

          {/* Módulo: Assiduidade / Ranking */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/assiduidade')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy-outline" size={24} color="#D97706" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Assiduidade</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Ranking sem faltas</Text>
          </TouchableOpacity>

          {/* Módulo: Classes */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/classes')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="school-outline" size={24} color="#2563EB" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Classes</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Gestão de turmas</Text>
          </TouchableOpacity>

          {/* Módulo: Alunos Ausentes */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/ausentes')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Ausentes</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Controle de visitas</Text>
          </TouchableOpacity>

          {/* Módulo: Relatórios */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
                borderWidth: isDarkMode ? 0 : 1,
              },
            ]}
            onPress={() => router.push('/relatorios')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="document-text-outline" size={24} color="#16A34A" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Relatórios</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Emissão de dados</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    padding: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: { padding: 4 },
  content: { padding: 16 },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: { fontSize: 14, fontWeight: 'bold' },
  gridSub: { fontSize: 11, marginTop: 2 },
});