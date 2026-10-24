import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Importa o cliente do Supabase e o Contexto de Tema
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext'; // Ajuste o caminho conforme o seu projeto

export default function AssiduidadeScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarRanking();
  }, []);

  const carregarRanking = async () => {
    try {
      setLoading(true);

      // 1. Buscar alunos
      const { data: alunosData, error: errorAlunos } = await supabase
        .from('alunos')
        .select('id, nome, classe')
        .order('nome', { ascending: true });

      if (errorAlunos) throw errorAlunos;

      // 2. Buscar registros de presença
      const { data: presencasData, error: errorPresencas } = await supabase
        .from('presenca')
        .select('aluno_id, presente');

      if (errorPresencas) throw errorPresencas;

      // 3. Processar estatísticas de cada aluno
      const listaRanking = (alunosData || []).map((aluno) => {
        const registosAluno = (presencasData || []).filter(
          (p) => p.aluno_id === aluno.id
        );
        const totalAulas = registosAluno.length;
        const totalPresencas = registosAluno.filter((p) => p.presente).length;

        const percentagem =
          totalAulas > 0 ? Math.round((totalPresencas / totalAulas) * 100) : 0;

        return {
          id: aluno.id,
          nome: aluno.nome,
          classe: aluno.classe,
          totalPresencas,
          totalAulas,
          percentagem,
        };
      });

      // 4. Ordenar o ranking (% de presença -> presenças totais -> nome)
      listaRanking.sort((a, b) => {
        if (b.percentagem !== a.percentagem) {
          return b.percentagem - a.percentagem;
        }
        if (b.totalPresencas !== a.totalPresencas) {
          return b.totalPresencas - a.totalPresencas;
        }
        return a.nome.localeCompare(b.nome);
      });

      setRanking(listaRanking);
    } catch (error) {
      console.log('Erro ao carregar ranking:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarRanking();
  };

  // Função segura para voltar no histórico de navegação
  const handleVoltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/superintendente'); // Rota de fallback caso não haja tela anterior
    }
  };

  const renderPosicaoBadge = (index) => {
    const posicao = index + 1;

    if (posicao === 1) {
      return (
        <View style={[
          styles.badgePosicao,
          {
            backgroundColor: isDarkMode ? '#451A03' : '#FEF3C7',
            borderColor: '#F59E0B'
          }
        ]}>
          <Text style={{ fontSize: 16 }}>🥇</Text>
          <Text style={[styles.textoPosicao, { color: isDarkMode ? '#FCD34D' : '#B45309' }]}>
            1º Lugar
          </Text>
        </View>
      );
    }

    if (posicao === 2) {
      return (
        <View style={[
          styles.badgePosicao,
          {
            backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
            borderColor: '#94A3B8'
          }
        ]}>
          <Text style={{ fontSize: 16 }}>🥈</Text>
          <Text style={[styles.textoPosicao, { color: isDarkMode ? '#E2E8F0' : '#475569' }]}>
            2º Lugar
          </Text>
        </View>
      );
    }

    if (posicao === 3) {
      return (
        <View style={[
          styles.badgePosicao,
          {
            backgroundColor: isDarkMode ? '#431407' : '#FFEDD5',
            borderColor: '#EA580C'
          }
        ]}>
          <Text style={{ fontSize: 16 }}>🥉</Text>
          <Text style={[styles.textoPosicao, { color: isDarkMode ? '#FDBA74' : '#C2410C' }]}>
            3º Lugar
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.badgePosicaoPadrao,
        { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }
      ]}>
        <Text style={[
          styles.textoPosicaoPadrao,
          { color: isDarkMode ? '#94A3B8' : '#64748B' }
        ]}>
          {posicao}º
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC') }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        {/* Botão de Voltar Seguro */}
        <TouchableOpacity
          onPress={handleVoltar}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
              borderColor: theme.border || (isDarkMode ? '#334155' : '#CBD5E1')
            }
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDarkMode ? '#F8FAFC' : '#0F172A'}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
            🏆 Ranking de Assiduidade
          </Text>
          <Text style={[styles.sub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Classificação de presença dos alunos
          </Text>
        </View>

        {/* Botão de Alternância de Tema */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeBtn,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
              borderColor: theme.border || (isDarkMode ? '#334155' : '#CBD5E1')
            }
          ]}
        >
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={20}
            color={isDarkMode ? '#F59E0B' : '#6366F1'}
          />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? '#60A5FA' : '#2563EB'}
              colors={[isDarkMode ? '#60A5FA' : '#2563EB']}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.cardAluno,
                {
                  backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
                  borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0'),
                },
                index === 0 && (isDarkMode ? styles.cardTop1Dark : styles.cardTop1Light),
                index === 1 && (isDarkMode ? styles.cardTop2Dark : styles.cardTop2Light),
                index === 2 && (isDarkMode ? styles.cardTop3Dark : styles.cardTop3Light),
              ]}
            >
              {renderPosicaoBadge(index)}

              <View style={styles.infoAluno}>
                <Text style={[styles.nomeAluno, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
                  {item.nome}
                </Text>
                <Text style={[styles.turmaAluno, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                  Turma: {item.classe || 'N/A'}
                </Text>
                <Text style={[styles.detalhesPresenca, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                  {item.totalPresencas} presenças em {item.totalAulas} aulas
                </Text>
              </View>

              <View style={styles.containerPercentagem}>
                <Text style={styles.textoPercentagem}>{item.percentagem}%</Text>
                <Text style={[styles.subPercentagem, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                  Presença
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
              Nenhum aluno registrado.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  sub: { marginTop: 2, fontSize: 12 },
  backBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  themeBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  cardAluno: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },

  // Destaques do Top 3 (Modo Escuro)
  cardTop1Dark: { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#181E29' },
  cardTop2Dark: { borderColor: '#94A3B8', borderWidth: 1.5, backgroundColor: '#181E29' },
  cardTop3Dark: { borderColor: '#EA580C', borderWidth: 1.5, backgroundColor: '#181E29' },

  // Destaques do Top 3 (Modo Claro)
  cardTop1Light: { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFBEB' },
  cardTop2Light: { borderColor: '#94A3B8', borderWidth: 1.5, backgroundColor: '#F8FAFC' },
  cardTop3Light: { borderColor: '#EA580C', borderWidth: 1.5, backgroundColor: '#FFF7ED' },

  badgePosicao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    gap: 4,
  },
  textoPosicao: { fontWeight: 'bold', fontSize: 12 },

  badgePosicaoPadrao: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textoPosicaoPadrao: { fontWeight: 'bold', fontSize: 13 },

  infoAluno: { flex: 1 },
  nomeAluno: { fontSize: 15, fontWeight: 'bold' },
  turmaAluno: { fontSize: 12, marginTop: 2 },
  detalhesPresenca: { fontSize: 11, marginTop: 2 },

  containerPercentagem: { alignItems: 'flex-end' },
  textoPercentagem: { fontSize: 18, fontWeight: 'bold', color: '#22C55E' },
  subPercentagem: { fontSize: 10 },

  emptyText: { textAlign: 'center', marginTop: 30 },
});