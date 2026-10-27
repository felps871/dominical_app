import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Importação do Contexto de Tema e Supabase
import { useTheme } from '../../context/ThemeContext'; 
import { supabase } from '../../supabase'; 

const CLASSES = ['Jovens', 'Adultos', 'Juniores', 'Crianças'];

export default function ChamadaScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [classe, setClasse] = useState('Jovens');

  // Cores dinâmicas para o gradiente de fundo conforme o tema
  const gradientColors = isDarkMode
    ? ['#0f172a', '#1e3a8a']
    : ['#f8fafc', '#cbd5e1'];

  // Controle de Abas
  const [tabAtiva, setTabAtiva] = useState('chamada'); // 'chamada' | 'historico'

  // Estados para Data e Horário
  const [dataChamada, setDataChamada] = useState(new Date());
  const [showPickerData, setShowPickerData] = useState(false);
  const [horario, setHorario] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Estados de Alunos e Presença
  const [alunos, setAlunos] = useState([]);
  const [presencas, setPresencas] = useState({});

  // Bíblias e Revistas
  const [qtdBiblias, setQtdBiblias] = useState(0);
  const [qtdRevistas, setQtdRevistas] = useState(0);

  // Modal de Justificativa
  const [alunoModal, setAlunoModal] = useState(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');

  // Estados de Histórico
  const [historicoAlunos, setHistoricoAlunos] = useState([]);
  const [historicoChamadas, setHistoricoChamadas] = useState([]);

  // Loadings
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Função segura para voltar na navegação evitando o erro de GO_BACK
  const handleVoltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback seguro caso não haja ecrã anterior na pilha
      router.replace('/'); // Ajuste para a rota principal/dashboard do seu app se necessário
    }
  };

  // Formata objeto Date para exibição ("DD/MM/AAAA")
  const formatarDataParaExibicao = (dateObj) => {
    if (!dateObj) return '';
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // Formata objeto Date em "YYYY-MM-DD" para salvar no Supabase
  const formatarDataParaISO = (dateObj) => {
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${ano}-${mes}-${dia}`;
  };

  // Handlers para DateTimePicker
  const handleValueChangeData = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPickerData(false);
    }
    if (selectedDate) {
      setDataChamada(selectedDate);
    }
  };

  // Busca alunos e histórico ao mudar de classe
  useEffect(() => {
    if (classe) {
      carregarAlunosEHistorico(classe);
    }
  }, [classe]);

  const carregarAlunosEHistorico = async (nomeClasse) => {
    setLoading(true);
    try {
      const { data: alunosData, error: errorAlunos } = await supabase
        .from('alunos')
        .select('id, nome, classe')
        .eq('classe', nomeClasse)
        .order('nome', { ascending: true });

      if (errorAlunos) throw errorAlunos;

      setAlunos(alunosData || []);
      setQtdBiblias(0);
      setQtdRevistas(0);

      // Preenche o estado inicial das presenças como 'P'
      const mapaInicial = {};
      (alunosData || []).forEach((aluno) => {
        mapaInicial[aluno.id] = {
          aluno_id: aluno.id,
          status: 'P',
          justificativa: '',
        };
      });
      setPresencas(mapaInicial);

      await carregarDadosHistorico(nomeClasse, alunosData || []);
    } catch (err) {
      Alert.alert('Erro', 'Erro ao carregar alunos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosHistorico = async (nomeClasse, listaAlunos) => {
    try {
      const { data: registros, error } = await supabase
        .from('presenca')
        .select('id, aluno_id, presente, data, horario, classe, qtd_biblias, qtd_revistas')
        .eq('classe', nomeClasse);

      if (error) return;

      // Cálculo de frequência por aluno
      const resumoAlunos = listaAlunos.map((aluno) => {
        const registrosAluno = (registros || []).filter((r) => r.aluno_id === aluno.id);
        const presencasCount = registrosAluno.filter((r) => r.presente === true).length;
        const faltasCount = registrosAluno.filter((r) => r.presente === false).length;
        const total = presencasCount + faltasCount;
        const porcentagem = total > 0 ? Math.round((presencasCount / total) * 100) : 0;

        return {
          aluno_id: aluno.id,
          nome: aluno.nome,
          totalPresencas: presencasCount,
          totalFaltas: faltasCount,
          porcentagemPresenca: porcentagem,
        };
      });

      // Agrupamento de chamadas por data/horário
      const chamadasAgrupadas = {};
      (registros || []).forEach((reg) => {
        const chave = `${reg.data}_${reg.horario}`;
        if (!chamadasAgrupadas[chave]) {
          chamadasAgrupadas[chave] = {
            id: chave,
            data: reg.data,
            horario: reg.horario,
            totalPresentes: 0,
            totalAusentes: 0,
            qtdBiblias: reg.qtd_biblias || 0,
            qtdRevistas: reg.qtd_revistas || 0,
          };
        }
        if (reg.presente) {
          chamadasAgrupadas[chave].totalPresentes += 1;
        } else {
          chamadasAgrupadas[chave].totalAusentes += 1;
        }
      });

      setHistoricoAlunos(resumoAlunos);
      setHistoricoChamadas(Object.values(chamadasAgrupadas));
    } catch (err) {
      console.log('Erro no histórico:', err.message);
    }
  };

  // Alterna o ciclo de presenças: P -> F -> FJ -> P
  const alternarPresenca = (alunoId) => {
    setPresencas((prev) => {
      const statusAtual = prev[alunoId]?.status || 'P';
      let novoStatus = 'P';

      if (statusAtual === 'P') novoStatus = 'F';
      else if (statusAtual === 'F') novoStatus = 'FJ';
      else novoStatus = 'P';

      return {
        ...prev,
        [alunoId]: {
          ...prev[alunoId],
          status: novoStatus,
        },
      };
    });
  };

  const salvarJustificativa = () => {
    if (alunoModal) {
      setPresencas((prev) => ({
        ...prev,
        [alunoModal.id]: {
          ...prev[alunoModal.id],
          justificativa: textoJustificativa,
        },
      }));
      setAlunoModal(null);
      setTextoJustificativa('');
    }
  };

  // Salva a chamada no Supabase
  const handleSalvar = async () => {
    if (alunos.length === 0) {
      Alert.alert('Atenção', 'Não há alunos nesta classe para registrar a chamada!');
      return;
    }

    setSalvando(true);
    const dataISO = formatarDataParaISO(dataChamada);

    const payload = Object.values(presencas).map((p) => ({
      aluno_id: p.aluno_id,
      classe: classe,
      data: dataISO,
      horario: horario,
      presente: p.status === 'P',
      justificativa: p.justificativa,
      qtd_biblias: Number(qtdBiblias) || 0,
      qtd_revistas: Number(qtdRevistas) || 0,
    }));

    const { error } = await supabase.from('presenca').upsert(payload, {
      onConflict: 'aluno_id,data,horario',
    });

    setSalvando(false);

    if (error) {
      Alert.alert('Erro', 'Erro ao salvar chamada: ' + error.message);
    } else {
      Alert.alert(
        'Sucesso 🎉',
        `Chamada da classe ${classe} registrada para o dia ${formatarDataParaExibicao(dataChamada)}!`
      );
      carregarAlunosEHistorico(classe);
    }
  };

  // Retorna estilo para botão P/F/FJ
  const getEstiloStatus = (status) => {
    switch (status) {
      case 'F':
        return { backgroundColor: '#EF4444', text: 'F' };
      case 'FJ':
        return { backgroundColor: '#F59E0B', text: 'FJ' };
      case 'P':
      default:
        return { backgroundColor: '#22C55E', text: 'P' };
    }
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
      borderColor: theme.border,
    },
  ];

  return (
    <LinearGradient colors={gradientColors} style={styles.background}>
      <StatusBar barStyle={theme.statusBar || (isDarkMode ? 'light-content' : 'dark-content')} backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }}>
        {/* TOP BAR / HEADER COM BOTÃO VOLTAR E ALTERNADOR DE TEMA */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            onPress={handleVoltar}
            style={[styles.themeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Chamada EBD</Text>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={22}
              color={isDarkMode ? '#F59E0B' : '#6366F1'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* SELEÇÃO DA CLASSE */}
          <Text style={[styles.label, { color: theme.subtext }]}>Selecione a Classe:</Text>
          <View style={styles.botoesClasse}>
            {CLASSES.map((item) => {
              const selecionada = classe === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.btnClasse,
                    {
                      backgroundColor: selecionada 
                        ? '#2563eb' 
                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : theme.card),
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setClasse(item)}
                >
                  <Text style={[styles.btnTexto, { color: selecionada ? '#FFF' : theme.text }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ABAS DE NAVEGAÇÃO */}
          <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tabAtiva === 'chamada' && { backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF' },
              ]}
              onPress={() => setTabAtiva('chamada')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tabAtiva === 'chamada' ? '#38bdf8' : theme.subtext },
                ]}
              >
                Lista de Presença
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                tabAtiva === 'historico' && { backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF' },
              ]}
              onPress={() => setTabAtiva('historico')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tabAtiva === 'historico' ? '#38bdf8' : theme.subtext },
                ]}
              >
                Histórico
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={isDarkMode ? '#38bdf8' : '#2563eb'} style={{ marginTop: 30 }} />
          ) : tabAtiva === 'chamada' ? (
            /* CONTEÚDO DE CHAMADA */
            <View style={{ width: '100%' }}>
              {/* DATA */}
              <Text style={[styles.label, { color: theme.subtext }]}>Data da Chamada:</Text>
              <TouchableOpacity
                style={[cardStyle, styles.datePickerButton]}
                onPress={() => setShowPickerData(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={isDarkMode ? '#38bdf8' : '#2563eb'} />
                <Text style={[styles.datePickerButtonText, { color: theme.text }]}>
                  {formatarDataParaExibicao(dataChamada)}
                </Text>
              </TouchableOpacity>

              {showPickerData && (
                <DateTimePicker
                  value={dataChamada}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleValueChangeData}
                />
              )}

              {/* HORÁRIO */}
              <Text style={[styles.label, { color: theme.subtext }]}>Horário:</Text>
              <TextInput
                style={[cardStyle, styles.input, { color: theme.text }]}
                value={horario}
                onChangeText={setHorario}
                placeholder="Ex: 09:00"
                placeholderTextColor={theme.subtext}
              />

              {/* CONTADORES: BÍBLIAS E REVISTAS */}
              <View style={styles.rowContadores}>
                <View style={{ flex: 0.48 }}>
                  <Text style={[styles.label, { color: theme.subtext }]}>📖 Bíblias:</Text>
                  <View style={styles.contadorBox}>
                    <TouchableOpacity
                      style={[styles.btnContador, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                      onPress={() => setQtdBiblias((v) => Math.max(0, v - 1))}
                    >
                      <Text style={[styles.btnContadorTexto, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[cardStyle, styles.inputContador, { color: theme.text }]}
                      value={String(qtdBiblias)}
                      onChangeText={(val) => setQtdBiblias(Number(val.replace(/[^0-9]/g, '')))}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.btnContador, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                      onPress={() => setQtdBiblias((v) => v + 1)}
                    >
                      <Text style={[styles.btnContadorTexto, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 0.48 }}>
                  <Text style={[styles.label, { color: theme.subtext }]}>📚 Revistas:</Text>
                  <View style={styles.contadorBox}>
                    <TouchableOpacity
                      style={[styles.btnContador, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                      onPress={() => setQtdRevistas((v) => Math.max(0, v - 1))}
                    >
                      <Text style={[styles.btnContadorTexto, { color: theme.text }]}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[cardStyle, styles.inputContador, { color: theme.text }]}
                      value={String(qtdRevistas)}
                      onChangeText={(val) => setQtdRevistas(Number(val.replace(/[^0-9]/g, '')))}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.btnContador, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                      onPress={() => setQtdRevistas((v) => v + 1)}
                    >
                      <Text style={[styles.btnContadorTexto, { color: theme.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* LISTA DE ALUNOS */}
              <Text style={[styles.label, { color: theme.subtext, marginTop: 15 }]}>
                Lista de Alunos ({alunos.length}):
              </Text>

              {alunos.length === 0 ? (
                <View style={cardStyle}>
                  <Text style={[styles.emptyText, { color: theme.subtext }]}>
                    Nenhum aluno cadastrado nesta classe.
                  </Text>
                </View>
              ) : (
                alunos.map((aluno) => {
                  const statusAtual = presencas[aluno.id]?.status || 'P';
                  const styleStatus = getEstiloStatus(statusAtual);
                  const temJustificativa = !!presencas[aluno.id]?.justificativa;

                  return (
                    <View key={aluno.id} style={[cardStyle, styles.alunoCard]}>
                      <Text style={[styles.alunoNome, { color: theme.text }]}>
                        {aluno.nome}
                      </Text>
                      <View style={styles.alunoAcoes}>
                        <TouchableOpacity
                          style={[
                            styles.btnJustificativa,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0' },
                            temJustificativa && { backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe' },
                          ]}
                          onPress={() => {
                            setAlunoModal(aluno);
                            setTextoJustificativa(presencas[aluno.id]?.justificativa || '');
                          }}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={18}
                            color={temJustificativa ? (isDarkMode ? '#38bdf8' : '#2563eb') : theme.subtext}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.btnStatus, { backgroundColor: styleStatus.backgroundColor }]}
                          onPress={() => alternarPresenca(aluno.id)}
                        >
                          <Text style={styles.btnStatusText}>{styleStatus.text}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {/* BOTÃO SALVAR */}
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={handleSalvar}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnSalvarTexto}>💾 Salvar Chamada</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* CONTEÚDO DE HISTÓRICO */
            <View style={{ width: '100%' }}>
              <Text style={[styles.label, { color: theme.subtext }]}>Frequência dos Alunos:</Text>
              {historicoAlunos.map((item) => (
                <View key={item.aluno_id} style={[cardStyle, { marginVertical: 4 }]}>
                  <Text style={[styles.historicoNome, { color: theme.text }]}>
                    {item.nome}
                  </Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statPresenca}>Presenças: [{item.totalPresencas}]</Text>
                    <Text style={styles.statFalta}>Faltas: [{item.totalFaltas}]</Text>
                    <Text style={[styles.statPorcentagem, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>
                      ({item.porcentagemPresenca}%)
                    </Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.label, { color: theme.subtext, marginTop: 20 }]}>
                Histórico de Chamadas:
              </Text>
              {historicoChamadas.length === 0 ? (
                <View style={cardStyle}>
                  <Text style={[styles.emptyText, { color: theme.subtext }]}>
                    Sem chamadas registradas nesta classe.
                  </Text>
                </View>
              ) : (
                historicoChamadas.map((item) => (
                  <View key={item.id} style={[cardStyle, { marginVertical: 4 }]}>
                    <Text style={[styles.historicoNome, { color: theme.text }]}>
                      📅 Data: {item.data}
                    </Text>
                    <Text style={[styles.historicoSubtext, { color: theme.subtext }]}>
                      Horário: {item.horario} | 📖 Bíblias: {item.qtdBiblias} | 📚 Revistas: {item.qtdRevistas}
                    </Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statPresenca}>Presentes: [{item.totalPresentes}]</Text>
                      <Text style={styles.statFalta}>Ausentes: [{item.totalAusentes}]</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* BOTÃO VOLTAR */}
          <TouchableOpacity style={styles.buttonVoltar} onPress={handleVoltar}>
            <Text style={styles.buttonVoltarTexto}>Voltar / Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL DE JUSTIFICATIVA */}
      <Modal visible={!!alunoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Justificativa de Ausência</Text>
            <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>{alunoModal?.nome}</Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Digite o motivo da falta..."
              placeholderTextColor={theme.subtext}
              value={textoJustificativa}
              onChangeText={setTextoJustificativa}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#475569' }]}
                onPress={() => setAlunoModal(null)}
              >
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2563eb' }]}
                onPress={salvarJustificativa}
              >
                <Text style={styles.modalBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  label: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  botoesClasse: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  btnClasse: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnTexto: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    marginVertical: 12,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    fontSize: 15,
  },
  rowContadores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contadorBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnContador: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnContadorTexto: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputContador: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
    paddingVertical: 6,
  },
  alunoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alunoNome: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  alunoAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnJustificativa: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  btnStatus: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStatusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnSalvar: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  btnSalvarTexto: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historicoNome: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historicoSubtext: {
    fontSize: 12,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statPresenca: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 13,
  },
  statFalta: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  statPorcentagem: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 10,
  },
  buttonVoltar: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  buttonVoltarTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});