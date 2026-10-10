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
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../supabase';

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
  const [perfilAluno, setPerfilAluno] = useState(null);
  const [mostrarDetalhesFreq, setMostrarDetalhesFreq] = useState(false);

  // Estado da frequência individual do aluno
  const [frequencia, setFrequencia] = useState({
    mes: 0,
    ano: 0,
    aulasPresentesMes: 0,
    aulasTotaisMes: 0,
    aulasPresentesAno: 0,
    aulasTotaisAno: 0,
  });

  const gradientColors = isDarkMode
    ? ['#0f172a', '#1e3a8a']
    : ['#f8fafc', '#cbd5e1'];

  useEffect(() => {
    carregarDadosAluno();
  }, []);

  const carregarDadosAluno = async () => {
    try {
      setLoading(true);

      // 1. Tenta obter o usuário logado
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: perfil } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();

        if (perfil) {
          setPerfilAluno(perfil);
        }

        await fetchFrequencia(user.id);
      }

      // 2. Busca as lições cadastradas na tabela "licoes"
      await fetchLicoes();

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicoes = async (classeAluno) => {
    try {
      let query = supabase
        .from('licoes')
        .select('*')
        .order('id', { ascending: false });

      if (classeAluno) {
        query = query.eq('classe', classeAluno);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar lições:', error.message);
      } else {
        setLicoes(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar lições:', err);
    }
  };

  const fetchFrequencia = async (alunoId) => {
    try {
      const { data: presencas, error } = await supabase
        .from('frequencias')
        .select('*')
        .eq('aluno_id', alunoId);

      if (error || !presencas) return;

      const agora = new Date();
      const mesAtual = agora.getMonth();
      const anoAtual = agora.getFullYear();

      const presencasMes = presencas.filter((item) => {
        const d = new Date(item.data);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      });

      const presencasAno = presencas.filter((item) => {
        const d = new Date(item.data);
        return d.getFullYear() === anoAtual;
      });

      const totaisMes = presencasMes.length;
      const presentesMes = presencasMes.filter(p => p.presente).length;
      const pctMes = totaisMes > 0 ? Math.round((presentesMes / totaisMes) * 100) : 0;

      const totaisAno = presencasAno.length;
      const presentesAno = presencasAno.filter(p => p.presente).length;
      const pctAno = totaisAno > 0 ? Math.round((presentesAno / totaisAno) * 100) : 0;

      setFrequencia({
        mes: pctMes,
        ano: pctAno,
        aulasPresentesMes: presentesMes,
        aulasTotaisMes: totaisMes,
        aulasPresentesAno: presentesAno,
        aulasTotaisAno: totaisAno,
      });
    } catch (err) {
      console.error('Erro ao buscar frequência:', err);
    }
  };

  const getBadgeAssiduidade = (percentual) => {
    if (percentual >= 90) {
      return { text: 'Excelente', icon: 'ribbon', color: '#10B981', bg: '#D1FAE5' };
    } else if (percentual >= 75) {
      return { text: 'Regular', icon: 'checkmark-circle', color: '#F59E0B', bg: '#FEF3C7' };
    } else {
      return { text: 'Atenção', icon: 'warning', color: '#EF4444', bg: '#FEE2E2' };
    }
  };

  const badgeMes = getBadgeAssiduidade(frequencia.mes);
  const badgeAno = getBadgeAssiduidade(frequencia.ano);

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
          {/* SAUDAÇÃO INDIVIDUAL */}
          <Text style={[styles.h1, { color: theme.text }]}>
            {perfilAluno ? `Olá, ${perfilAluno.nome} ` : 'Olá '}
          </Text>

          {/* ================= 1. MINI CARD DE FREQUÊNCIA RESUMIDO ================= */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setMostrarDetalhesFreq(!mostrarDetalhesFreq)}
            style={[
              styles.miniCardFreq,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.miniCardRow}>
              <View style={styles.miniCardInfoLeft}>
                <Ionicons name="stats-chart" size={18} color={isDarkMode ? '#38bdf8' : '#2563eb'} />
                <Text style={[styles.miniCardTitle, { color: theme.text }]}>
                  Frequência: <Text style={{ fontWeight: 'bold' }}>{frequencia.mes}% Mês</Text>
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.badgeContainer, { backgroundColor: badgeMes.bg }]}>
                  <Ionicons name={badgeMes.icon} size={12} color={badgeMes.color} />
                  <Text style={[styles.badgeText, { color: badgeMes.color }]}>{badgeMes.text}</Text>
                </View>
                <Ionicons
                  name={mostrarDetalhesFreq ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.subtext}
                />
              </View>
            </View>

            {/* DETALHES EXPANSÍVEIS DA FREQUÊNCIA */}
            {mostrarDetalhesFreq && (
              <View style={styles.expandedFreqContainer}>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Presença Mensal */}
                <View style={styles.freqMetricContainer}>
                  <Text style={[styles.freqLabel, { color: theme.text }]}>Presença Mensal</Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${frequencia.mes}%`, backgroundColor: badgeMes.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressPercentText, { color: theme.text }]}>
                      {frequencia.mes}%
                    </Text>
                  </View>
                  <Text style={[styles.freqSubtext, { color: theme.subtext }]}>
                    {frequencia.aulasPresentesMes} de {frequencia.aulasTotaisMes} aulas no mês
                  </Text>
                </View>

                {/* Presença Anual */}
                <View style={[styles.freqMetricContainer, { marginTop: 10 }]}>
                  <View style={styles.freqHeaderRow}>
                    <Text style={[styles.freqLabel, { color: theme.text }]}>Presença Anual</Text>
                    <View style={[styles.badgeContainer, { backgroundColor: badgeAno.bg }]}>
                      <Ionicons name={badgeAno.icon} size={12} color={badgeAno.color} />
                      <Text style={[styles.badgeText, { color: badgeAno.color }]}>{badgeAno.text}</Text>
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${frequencia.ano}%`, backgroundColor: badgeAno.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressPercentText, { color: theme.text }]}>
                      {frequencia.ano}%
                    </Text>
                  </View>
                  <Text style={[styles.freqSubtext, { color: theme.subtext }]}>
                    {frequencia.aulasPresentesAno} de {frequencia.aulasTotaisAno} aulas no ano
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* ================= 2. PRÓXIMAS LIÇÕES AGENDADAS ================= */}
          <Text style={[styles.h2, { color: theme.text }]}>Próximas Lições Agendadas</Text>

          {loading ? (
            <ActivityIndicator size="large" color={isDarkMode ? '#38bdf8' : '#2563eb'} style={{ marginVertical: 20 }} />
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
  h1: { fontSize: 26, fontWeight: 'bold', marginBottom: 12, width: '100%' },
  h2: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8, width: '100%' },

  /* Estilos do Mini Card de Frequência */
  miniCardFreq: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  miniCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCardInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniCardTitle: {
    fontSize: 14,
  },
  expandedFreqContainer: {
    marginTop: 4,
  },

  /* Estilos do Card de Lições */
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

  /* Badges e Barras de Progresso */
  freqMetricContainer: {
    marginVertical: 2,
  },
  freqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  freqLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'right',
  },
  freqSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.5,
  },
});