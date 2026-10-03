import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Ajuste o caminho até ao seu ThemeContext
import { supabase } from '../../supabase'; // Ajuste o caminho até o seu ficheiro supabase.js

// Converte a string "YYYY-MM-DD" do banco para "DD/MM/AAAA"
const formatarDataBR = (dataString) => {
  if (!dataString) return '';
  const apenasData = dataString.split('T')[0];
  const partes = apenasData.split('-');
  if (partes.length !== 3) return dataString;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
};

export default function AlunoScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [licoes, setLicoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cores dinâmicas para o gradiente de fundo conforme o tema
  const gradientColors = isDarkMode
    ? ['#0f172a', '#1e3a8a']
    : ['#f8fafc', '#cbd5e1'];

  // Busca as lições na base de dados assim que a tela abre
  useEffect(() => {
    fetchLicoes();
  }, []);

  const fetchLicoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('licoes')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lições:', error.message);
      } else {
        setLicoes(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.background}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }}>
        {/* BOTÃO PARA ALTERNAR O TEMA NO TOPO */}
        <View style={styles.headerTheme}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={22}
              color={isDarkMode ? '#F59E0B' : '#6366F1'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={[styles.h1, { color: theme.text }]}>Painel do Aluno</Text>
          <Text style={[styles.p, { color: theme.subtext }]}>Próximas Lições Agendadas</Text>

          {/* Indicador de Carregamento */}
          {loading ? (
            <ActivityIndicator size="large" color={isDarkMode ? '#38bdf8' : '#2563eb'} style={{ marginTop: 20 }} />
          ) : licoes.length === 0 ? (
            <View
              style={[
                styles.cardInfo,
                {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.cardTitulo, { color: theme.text }]}>Nenhuma Lição Cadastrada</Text>
              <Text style={[styles.cardSub, { color: theme.subtext }]}>
                O Superintendente ainda não lançou as próximas aulas.
              </Text>
            </View>
          ) : (
            /* Lista de Lições Cadastradas */
            licoes.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.cardInfo,
                  {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.badgeClasse}>{item.classe}</Text>
                  {/* Exibição da data formatada no padrão DD/MM/AAAA */}
                  <Text style={[styles.cardData, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>
                    📅 {formatarDataBR(item.data)}
                  </Text>
                </View>
                <Text style={[styles.cardTitulo, { color: theme.text }]}>{item.titulo}</Text>
                <Text style={[styles.cardSub, { color: theme.subtext }]}>
                  👨‍🏫 Professor: {item.professor}
                </Text>
              </View>
            ))
          )}

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
  headerTheme: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  themeButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20 },
  h1: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  p: { fontSize: 14, marginBottom: 20 },
  cardInfo: { 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 8, 
    width: '100%',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeClasse: {
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardData: { fontSize: 12, fontWeight: 'bold' },
  cardTitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { fontSize: 14 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, marginTop: 24, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});