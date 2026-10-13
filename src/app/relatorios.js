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

export default function SuperintendenteScreen() {
  const [relatorioLicoes, setRelatorioLicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPIs Gerais Consolidados
  const [kpisGerais, setKpisGerais] = useState({
    totalMatriculados: 0,
    mediaPresenca: 0,
    totalBiblias: 0,
    totalRevistas: 0,
    totalAulas: 0,
  });

  useEffect(() => {
    carregarRelatorioLicoes();
  }, []);

  const carregarRelatorioLicoes = async () => {
    try {
      setLoading(true);

      // 1. Buscar lista de alunos para saber o total de matriculados na EBD
      const { data: alunosData, error: errorAlunos } = await supabase
        .from('alunos')
        .select('id');

      if (errorAlunos) throw errorAlunos;

      // 2. Buscar todas as presenças da tabela original
      const { data: presencasData, error: errorPresencas } = await supabase
        .from('presenca')
        .select('aluno_id, presente, qtd_biblias, qtd_revistas, data, classe')
        .order('data', { ascending: false });

      if (errorPresencas) throw errorPresencas;

      const totalMatriculados = alunosData?.length || 0;
      const presencas = presencasData || [];

      // 3. Agrupar os registros por Data (Lição)
      const licoesMap = {};

      presencas.forEach((p) => {
        const dataAula = p.data;

        if (!licoesMap[dataAula]) {
          licoesMap[dataAula] = {
            data: dataAula,
            totalPresentes: 0,
            totalAusentes: 0,
            turmasEnvolvidas: new Set(),
            materiaisPorTurma: {}, // Mapeia o lançamento de cada turma nessa data
          };
        }

        const licaoAtual = licoesMap[dataAula];
        const chaveClasse = p.classe || 'geral';

        // Registra o maior valor de bíbliotecas e revistas enviado pela chamada da turma
        if (!licaoAtual.materiaisPorTurma[chaveClasse]) {
          licaoAtual.materiaisPorTurma[chaveClasse] = {
            biblias: 0,
            revistas: 0,
          };
        }

        if ((p.qtd_biblias || 0) > licaoAtual.materiaisPorTurma[chaveClasse].biblias) {
          licaoAtual.materiaisPorTurma[chaveClasse].biblias = p.qtd_biblias || 0;
        }

        if ((p.qtd_revistas || 0) > licaoAtual.materiaisPorTurma[chaveClasse].revistas) {
          licaoAtual.materiaisPorTurma[chaveClasse].revistas = p.qtd_revistas || 0;
        }

        if (p.classe) licaoAtual.turmasEnvolvidas.add(p.classe);

        // Contagem de alunos presentes e ausentes
        if (p.presente === true) {
          licaoAtual.totalPresentes += 1;
        } else {
          licaoAtual.totalAusentes += 1;
        }
      });

      // 4. Transformar o Mapa em Lista Ordenada
      const listaLicoes = Object.values(licoesMap).map((licao) => {
        // Soma as Bíblias e Revistas de todas as turmas que lançaram aula na data
        const qtdBiblias = Object.values(licao.materiaisPorTurma).reduce(
          (acc, curr) => acc + curr.biblias,
          0
        );
        const qtdRevistas = Object.values(licao.materiaisPorTurma).reduce(
          (acc, curr) => acc + curr.revistas,
          0
        );

        const totalRegistrados = licao.totalPresentes + licao.totalAusentes;
        const baseAlunos = totalRegistrados > 0 ? totalRegistrados : totalMatriculados;
        const pctFrequencia =
          baseAlunos > 0 ? Math.round((licao.totalPresentes / baseAlunos) * 100) : 0;

        return {
          data: licao.data,
          totalPresentes: licao.totalPresentes,
          totalAusentes: licao.totalAusentes,
          qtdBiblias,
          qtdRevistas,
          pctFrequencia,
          qtdTurmas: licao.turmasEnvolvidas.size,
        };
      });

      // Ordenar do domingo mais recente para o mais antigo
      listaLicoes.sort((a, b) => new Date(b.data) - new Date(a.data));

      // 5. Calcular KPIs do Topo da Tela
      const totalAulas = listaLicoes.length;
      const somaPresentes = listaLicoes.reduce((acc, l) => acc + l.totalPresentes, 0);
      const totalBiblias = listaLicoes.reduce((acc, l) => acc + l.qtdBiblias, 0);
      const totalRevistas = listaLicoes.reduce((acc, l) => acc + l.qtdRevistas, 0);

      const mediaPresenca = totalAulas > 0 ? Math.round(somaPresentes / totalAulas) : 0;

      setKpisGerais({
        totalMatriculados,
        mediaPresenca,
        totalBiblias,
        totalRevistas,
        totalAulas,
      });

      setRelatorioLicoes(listaLicoes);
    } catch (error) {
      console.log('Erro ao carregar relatório de lições:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarRelatorioLicoes();
  };

  // Converte data de YYYY-MM-DD para DD/MM/YYYY
  const formatarData = (dataString) => {
    if (!dataString) return 'Data N/A';
    const partes = dataString.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
  };

  // Cabeçalho superior com o resumo dos números gerais
  const renderHeaderComponent = () => (
    <View style={styles.dashboardContainer}>
      <Text style={styles.sectionTitle}>Visão Geral das Lições</Text>
      <View style={styles.gridKpi}>
        <View style={[styles.cardKpi, styles.cardKpiDestaque]}>
          <Text style={styles.labelKpi}>Média de Presentes / Aula</Text>
          <Text style={styles.valorKpi}>
            {kpisGerais.mediaPresenca}{' '}
            <Text style={styles.subValorKpi}>/ {kpisGerais.totalMatriculados} alunos</Text>
          </Text>
          <Text style={styles.badgeKpi}>
            {kpisGerais.totalAulas} aula(s)/lição(ões) registrada(s)
          </Text>
        </View>

        <View style={styles.cardKpi}>
          <Text style={styles.labelKpi}>Total Bíblias</Text>
          <Text style={[styles.valorKpi, { color: '#F59E0B' }]}>{kpisGerais.totalBiblias}</Text>
          <Text style={styles.subTextKpi}>Acumulado total</Text>
        </View>

        <View style={styles.cardKpi}>
          <Text style={styles.labelKpi}>Total Revistas</Text>
          <Text style={[styles.valorKpi, { color: '#A855F7' }]}>{kpisGerais.totalRevistas}</Text>
          <Text style={styles.subTextKpi}>Acumulado total</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 8 }]}>
        📅 Relatório Detalhado por Lição/Data
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Cabeçalho da Tela */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Relatório de Lições</Text>
        <Text style={styles.sub}>Acompanhamento por data de aula na EBD</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={relatorioLicoes}
          keyExtractor={(item) => String(item.data)}
          ListHeaderComponent={renderHeaderComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.cardLicao}>
              {/* Data e % de Presença */}
              <View style={styles.headerLicao}>
                <View style={styles.badgeData}>
                  <Text style={styles.textoData}>📅 Aula: {formatarData(item.data)}</Text>
                </View>
                <Text style={styles.pctFrequencia}>{item.pctFrequencia}% Presença</Text>
              </View>

              {/* Estatísticas da Lição naquele domingo */}
              <View style={styles.detalhesLicaoGrid}>
                <View style={styles.colunaMetrica}>
                  <Text style={styles.labelMetrica}>Presentes</Text>
                  <Text style={[styles.valorMetrica, { color: '#22C55E' }]}>
                    {item.totalPresentes}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={styles.labelMetrica}>Ausentes</Text>
                  <Text style={[styles.valorMetrica, { color: '#EF4444' }]}>
                    {item.totalAusentes}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={styles.labelMetrica}>Bíblias</Text>
                  <Text style={[styles.valorMetrica, { color: '#F59E0B' }]}>
                    {item.qtdBiblias}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={styles.labelMetrica}>Revistas</Text>
                  <Text style={[styles.valorMetrica, { color: '#A855F7' }]}>
                    {item.qtdRevistas}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma lição registrada até o momento.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#0F172A' },
  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC' },
  sub: { color: '#94A3B8', marginTop: 2, fontSize: 14 },

  // Estilos Dashboard KPI
  dashboardContainer: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#F1F5F9', marginBottom: 10 },
  gridKpi: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardKpi: {
    width: '48%',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardKpiDestaque: { borderColor: '#3B82F6', backgroundColor: '#1E3A8A20', width: '100%' },
  labelKpi: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  valorKpi: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginVertical: 2 },
  subValorKpi: { fontSize: 13, color: '#64748B', fontWeight: 'normal' },
  badgeKpi: { fontSize: 11, fontWeight: 'bold', color: '#60A5FA', marginTop: 2 },
  subTextKpi: { fontSize: 11, color: '#64748B', marginTop: 2 },

  // Estilos Cards de Lições
  cardLicao: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerLicao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  badgeData: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoData: { color: '#93C5FD', fontWeight: 'bold', fontSize: 13 },
  pctFrequencia: { fontSize: 14, fontWeight: 'bold', color: '#22C55E' },

  detalhesLicaoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colunaMetrica: {
    alignItems: 'center',
    flex: 1,
  },
  labelMetrica: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  valorMetrica: { fontSize: 16, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 30 },
});