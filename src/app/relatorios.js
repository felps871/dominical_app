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
import { useTheme } from '../context/ThemeContext'; // Ajuste o caminho conforme seu projeto

export default function SuperintendenteScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

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
      <Text style={[styles.sectionTitle, { color: theme.text || (isDarkMode ? '#F1F5F9' : '#0F172A') }]}>
        Visão Geral das Lições
      </Text>
      
      <View style={styles.gridKpi}>
        {/* Card Destaque */}
        <View style={[
          styles.cardKpi,
          styles.cardKpiDestaque,
          {
            backgroundColor: isDarkMode ? '#1E3A8A20' : '#EFF6FF',
            borderColor: isDarkMode ? '#3B82F6' : '#93C5FD'
          }
        ]}>
          <Text style={[styles.labelKpi, { color: isDarkMode ? '#94A3B8' : '#475569' }]}>
            Média de Presentes / Aula
          </Text>
          <Text style={[styles.valorKpi, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
            {kpisGerais.mediaPresenca}{' '}
            <Text style={[styles.subValorKpi, { color: isDarkMode ? '#64748B' : '#64748B' }]}>
              / {kpisGerais.totalMatriculados} alunos
            </Text>
          </Text>
          <Text style={[styles.badgeKpi, { color: isDarkMode ? '#60A5FA' : '#2563EB' }]}>
            {kpisGerais.totalAulas} aula(s)/lição(ões) registrada(s)
          </Text>
        </View>

        {/* Card Bíblias */}
        <View style={[
          styles.cardKpi,
          {
            backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
            borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0')
          }
        ]}>
          <Text style={[styles.labelKpi, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Total Bíblias</Text>
          <Text style={[styles.valorKpi, { color: '#F59E0B' }]}>{kpisGerais.totalBiblias}</Text>
          <Text style={[styles.subTextKpi, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>Acumulado total</Text>
        </View>

        {/* Card Revistas */}
        <View style={[
          styles.cardKpi,
          {
            backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
            borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0')
          }
        ]}>
          <Text style={[styles.labelKpi, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Total Revistas</Text>
          <Text style={[styles.valorKpi, { color: '#A855F7' }]}>{kpisGerais.totalRevistas}</Text>
          <Text style={[styles.subTextKpi, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>Acumulado total</Text>
        </View>
      </View>

      <Text style={[
        styles.sectionTitle,
        {
          marginTop: 16,
          marginBottom: 8,
          color: theme.text || (isDarkMode ? '#F1F5F9' : '#0F172A')
        }
      ]}>
        📅 Relatório Detalhado por Lição/Data
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC') }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Cabeçalho da Tela */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
            📊 Relatório de Lições
          </Text>
          <Text style={[styles.sub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Acompanhamento por data de aula na EBD
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
          data={relatorioLicoes}
          keyExtractor={(item) => String(item.data)}
          ListHeaderComponent={renderHeaderComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? '#60A5FA' : '#2563EB'}
              colors={[isDarkMode ? '#60A5FA' : '#2563EB']}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={[
              styles.cardLicao,
              {
                backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
                borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0'),
              }
            ]}>
              {/* Data e % de Presença */}
              <View style={[
                styles.headerLicao,
                { borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }
              ]}>
                <View style={[
                  styles.badgeData,
                  { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }
                ]}>
                  <Text style={[
                    styles.textoData,
                    { color: isDarkMode ? '#93C5FD' : '#1E40AF' }
                  ]}>
                    📅 Aula: {formatarData(item.data)}
                  </Text>
                </View>
                <Text style={styles.pctFrequencia}>{item.pctFrequencia}% Presença</Text>
              </View>

              {/* Estatísticas da Lição naquele domingo */}
              <View style={styles.detalhesLicaoGrid}>
                <View style={styles.colunaMetrica}>
                  <Text style={[styles.labelMetrica, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Presentes
                  </Text>
                  <Text style={[styles.valorMetrica, { color: '#22C55E' }]}>
                    {item.totalPresentes}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={[styles.labelMetrica, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Ausentes
                  </Text>
                  <Text style={[styles.valorMetrica, { color: '#EF4444' }]}>
                    {item.totalAusentes}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={[styles.labelMetrica, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Bíblias
                  </Text>
                  <Text style={[styles.valorMetrica, { color: '#F59E0B' }]}>
                    {item.qtdBiblias}
                  </Text>
                </View>

                <View style={styles.colunaMetrica}>
                  <Text style={[styles.labelMetrica, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Revistas
                  </Text>
                  <Text style={[styles.valorMetrica, { color: '#A855F7' }]}>
                    {item.qtdRevistas}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
              Nenhuma lição registrada até o momento.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  sub: { marginTop: 2, fontSize: 13 },
  themeBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  // Estilos Dashboard KPI
  dashboardContainer: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  gridKpi: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardKpi: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },
  cardKpiDestaque: { width: '100%' },
  labelKpi: { fontSize: 12, fontWeight: '500' },
  valorKpi: { fontSize: 22, fontWeight: 'bold', marginVertical: 2 },
  subValorKpi: { fontSize: 13, fontWeight: 'normal' },
  badgeKpi: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  subTextKpi: { fontSize: 11, marginTop: 2 },

  // Estilos Cards de Lições
  cardLicao: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
  },
  headerLicao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  badgeData: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoData: { fontWeight: 'bold', fontSize: 13 },
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
  labelMetrica: { fontSize: 11, marginBottom: 2 },
  valorMetrica: { fontSize: 16, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', marginTop: 30 },
});