import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function AssiduidadeScreen() {
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

  const renderPosicaoBadge = (index) => {
    const posicao = index + 1;

    if (posicao === 1) {
      return (
        <View style={[styles.badgePosicao, { backgroundColor: '#451A03', borderColor: '#F59E0B' }]}>
          <Text style={{ fontSize: 16 }}>🥇</Text>
          <Text style={[styles.textoPosicao, { color: '#FCD34D' }]}>1º Lugar</Text>
        </View>
      );
    }

    if (posicao === 2) {
      return (
        <View style={[styles.badgePosicao, { backgroundColor: '#1E293B', borderColor: '#94A3B8' }]}>
          <Text style={{ fontSize: 16 }}>🥈</Text>
          <Text style={[styles.textoPosicao, { color: '#E2E8F0' }]}>2º Lugar</Text>
        </View>
      );
    }

    if (posicao === 3) {
      return (
        <View style={[styles.badgePosicao, { backgroundColor: '#431407', borderColor: '#EA580C' }]}>
          <Text style={{ fontSize: 16 }}>🥉</Text>
          <Text style={[styles.textoPosicao, { color: '#FDBA74' }]}>3º Lugar</Text>
        </View>
      );
    }

    return (
      <View style={styles.badgePosicaoPadrao}>
        <Text style={styles.textoPosicaoPadrao}>{posicao}º</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Ranking de Assiduidade</Text>
        <Text style={styles.sub}>Classificação de presença dos alunos</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.cardAluno,
                index === 0 && styles.cardTop1,
                index === 1 && styles.cardTop2,
                index === 2 && styles.cardTop3,
              ]}
            >
              {renderPosicaoBadge(index)}

              <View style={styles.infoAluno}>
                <Text style={styles.nomeAluno}>{item.nome}</Text>
                <Text style={styles.turmaAluno}>Turma: {item.classe || 'N/A'}</Text>
                <Text style={styles.detalhesPresenca}>
                  {item.totalPresencas} presenças em {item.totalAulas} aulas
                </Text>
              </View>

              <View style={styles.containerPercentagem}>
                <Text style={styles.textoPercentagem}>{item.percentagem}%</Text>
                <Text style={styles.subPercentagem}>Presença</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum aluno registrado.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0F172A' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC' },
  sub: { color: '#94A3B8', marginTop: 4, fontSize: 14 },

  cardAluno: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop1: { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#181E29' },
  cardTop2: { borderColor: '#94A3B8', borderWidth: 1.5, backgroundColor: '#181E29' },
  cardTop3: { borderColor: '#EA580C', borderWidth: 1.5, backgroundColor: '#181E29' },

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
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textoPosicaoPadrao: { fontWeight: 'bold', color: '#94A3B8', fontSize: 13 },

  infoAluno: { flex: 1 },
  nomeAluno: { fontSize: 15, fontWeight: 'bold', color: '#F8FAFC' },
  turmaAluno: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  detalhesPresenca: { fontSize: 11, color: '#64748B', marginTop: 2 },

  containerPercentagem: { alignItems: 'flex-end' },
  textoPercentagem: { fontSize: 18, fontWeight: 'bold', color: '#22C55E' },
  subPercentagem: { fontSize: 10, color: '#94A3B8' },

  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 30 },
});