import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../supabase';

export default function ChamadaScreen() {
  // Aba ativa (Chamada Atual vs Histórico)
  const [tabAtiva, setTabAtiva] = useState('chamada');
  const [subTabHistorico, setSubTabHistorico] = useState('alunos');

  // Estados da Chamada
  const [classes, setClasses] = useState([]);
  const [classeSelecionada, setClasseSelecionada] = useState('');
  const [alunos, setAlunos] = useState([]);
  const [presencas, setPresencas] = useState({});

  // Estados para Quantidade de Bíblias e Revistas da Turma
  const [qtdBiblias, setQtdBiblias] = useState(0);
  const [qtdRevistas, setQtdRevistas] = useState(0);

  // Estados para Data (Objeto Date + Picker Modal)
  const [dataObjeto, setDataObjeto] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [horarioChamada, setHorarioChamada] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Modal para Justificativa
  const [alunoModal, setAlunoModal] = useState(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');

  // Estados de Histórico
  const [historicoAlunos, setHistoricoAlunos] = useState([]);
  const [historicoChamadas, setHistoricoChamadas] = useState([]);

  // Feedback e Loading
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Formatação de data
  const formatarDataBR = (dateObj) => {
    if (!dateObj) return '';
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataISO = (dateObj) => {
    if (!dateObj) return '';
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${ano}-${mes}-${dia}`;
  };

  // Handler do Calendário
  const onChangeDate = (event, selectedDate) => {
    if (selectedDate) {
      setDataObjeto(selectedDate);
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  // 1. Carregar Classes ao montar o ecrã
  useEffect(() => {
    carregarClasses();
  }, []);

  // 2. Carregar Alunos quando a Classe selecionada mudar
  useEffect(() => {
    if (classeSelecionada) {
      carregarAlunosEHistorico(classeSelecionada);
    }
  }, [classeSelecionada]);

  // Carrega as classes únicas a partir da coluna "classe" da tabela "alunos"
  const carregarClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('classe');

      if (error) throw error;

      if (data && data.length > 0) {
        const classesUnicas = [...new Set(data.map((item) => item.classe).filter(Boolean))];
        
        const listaClasses = classesUnicas.map((nomeClasse) => ({
          id: nomeClasse,
          nome: nomeClasse,
        }));

        setClasses(listaClasses);
        if (listaClasses.length > 0) {
          setClasseSelecionada(listaClasses[0].id);
        }
      }
    } catch (err) {
      Alert.alert('Erro ao carregar classes', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carrega os alunos filtrando pelo nome da classe selecionada
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

      // Resetar contagem de bíblias e revistas ao mudar de turma
      setQtdBiblias(0);
      setQtdRevistas(0);

      // Inicializar mapa de presenças
      const mapaPresencas = {};
      (alunosData || []).forEach((aluno) => {
        mapaPresencas[aluno.id] = {
          aluno_id: aluno.id,
          presente: false,
          justificativa: '',
        };
      });
      setPresencas(mapaPresencas);

      // Carregar histórico
      await carregarDadosHistorico(nomeClasse, alunosData || []);
    } catch (err) {
      Alert.alert('Erro ao carregar dados dos alunos', err.message);
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

      if (error && error.code !== 'PGRST116') {
        console.log('Aviso ao carregar histórico:', error.message);
      }

      // Processar estatísticas de alunos
      const resumoAlunos = listaAlunos.map((aluno) => {
        const registrosAluno = (registros || []).filter((r) => r.aluno_id === aluno.id);
        const presencasCount = registrosAluno.filter((r) => r.presente).length;
        const faltasCount = registrosAluno.filter((r) => !r.presente).length;
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

      // Agrupar estatísticas por chamadas (Datas)
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
      console.log('Erro ao processar estatísticas do histórico:', err.message);
    }
  };

  // Alternar presença (Radio Button)
  const togglePresenca = (alunoId) => {
    setPresencas((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presente: !prev[alunoId]?.presente,
      },
    }));
  };

  // Salvar Justificativa no Estado Local
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

  // Enviar Chamada para o Supabase com Bíblias e Revistas
  const handleSalvarChamada = async () => {
    if (!classeSelecionada) {
      Alert.alert('Atenção', 'Selecione uma classe antes de salvar.');
      return;
    }

    setSalvando(true);
    try {
      const dataISO = formatarDataISO(dataObjeto);
      const payload = Object.values(presencas).map((p) => ({
        aluno_id: p.aluno_id,
        classe: classeSelecionada,
        data: dataISO,
        horario: horarioChamada,
        presente: p.presente,
        justificativa: p.justificativa,
        qtd_biblias: Number(qtdBiblias) || 0,
        qtd_revistas: Number(qtdRevistas) || 0,
      }));

      const { error } = await supabase.from('presenca').upsert(payload);

      if (error) throw error;

      Alert.alert('Sucesso 🎉', 'Chamada salva com sucesso!');
      carregarAlunosEHistorico(classeSelecionada);
    } catch (err) {
      Alert.alert('Erro ao salvar chamada', err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <Text style={styles.title}>📋 Gestão de Classes & Chamada</Text>

      {/* Seletor de Classe */}
      <Text style={styles.labelSection}>Selecionar Turma / Classe:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classSelector}>
        {classes.map((cls) => (
          <TouchableOpacity
            key={cls.id}
            style={[
              styles.classChip,
              classeSelecionada === cls.id && styles.classChipSelected,
            ]}
            onPress={() => setClasseSelecionada(cls.id)}
          >
            <Text
              style={[
                styles.classChipText,
                classeSelecionada === cls.id && styles.classChipTextSelected,
              ]}
            >
              {cls.nome}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navegação entre Chamada e Histórico */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, tabAtiva === 'chamada' && styles.tabButtonActive]}
          onPress={() => setTabAtiva('chamada')}
        >
          <Text
            style={[styles.tabText, tabAtiva === 'chamada' && styles.tabTextActive]}
          >
            Realizar Chamada
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tabAtiva === 'historico' && styles.tabButtonActive]}
          onPress={() => setTabAtiva('historico')}
        >
          <Text
            style={[styles.tabText, tabAtiva === 'historico' && styles.tabTextActive]}
          >
            Histórico
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 40 }} />
      ) : tabAtiva === 'chamada' ? (
        /* ABA REALIZAR CHAMADA */
        <View style={{ flex: 1 }}>
          {/* Data e Horário */}
          <View style={styles.dateTimeRow}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Data:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#38BDF8" />
                <Text style={styles.datePickerText}>{formatarDataBR(dataObjeto)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Horário:</Text>
              <TextInput
                style={styles.textInput}
                value={horarioChamada}
                onChangeText={setHorarioChamada}
                placeholder="HH:MM"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          {/* Quantidade de Bíblias e Revistas da Turma */}
          <View style={styles.dateTimeRow}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>📖 Bíblias da Turma:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#334155', paddingHorizontal: 12 }]}
                  onPress={() => setQtdBiblias((prev) => Math.max(0, prev - 1))}
                >
                  <Text style={styles.modalBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, { flex: 1, textAlign: 'center', marginHorizontal: 4 }]}
                  value={String(qtdBiblias)}
                  onChangeText={(val) => setQtdBiblias(Number(val.replace(/[^0-9]/g, '')))}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#334155', paddingHorizontal: 12 }]}
                  onPress={() => setQtdBiblias((prev) => prev + 1)}
                >
                  <Text style={styles.modalBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>📚 Revistas da Turma:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#334155', paddingHorizontal: 12 }]}
                  onPress={() => setQtdRevistas((prev) => Math.max(0, prev - 1))}
                >
                  <Text style={styles.modalBtnText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, { flex: 1, textAlign: 'center', marginHorizontal: 4 }]}
                  value={String(qtdRevistas)}
                  onChangeText={(val) => setQtdRevistas(Number(val.replace(/[^0-9]/g, '')))}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#334155', paddingHorizontal: 12 }]}
                  onPress={() => setQtdRevistas((prev) => prev + 1)}
                >
                  <Text style={styles.modalBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dataObjeto}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>Marque os PRESENTES</Text>
          </View>

          {/* Lista de Alunos */}
          <FlatList
            data={alunos}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const estaPresente = presencas[item.id]?.presente || false;
              const temJustificativa = !!presencas[item.id]?.justificativa;

              return (
                <View style={styles.alunoCard}>
                  <Text style={styles.alunoNome}>{item.nome}</Text>

                  <View style={styles.alunoAcoes}>
                    <TouchableOpacity
                      style={[
                        styles.justificativaBadge,
                        temJustificativa && styles.justificativaBadgeAtiva,
                      ]}
                      onPress={() => {
                        setAlunoModal(item);
                        setTextoJustificativa(presencas[item.id]?.justificativa || '');
                      }}
                    >
                      <Ionicons 
                        name="chatbubble-ellipses-outline" 
                        size={18} 
                        color={temJustificativa ? '#38BDF8' : '#94A3B8'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.radioContainer}
                      onPress={() => togglePresenca(item.id)}
                    >
                      <View
                        style={[
                          styles.radioButton,
                          estaPresente && styles.radioButtonChecked,
                        ]}
                      >
                        {estaPresente && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text style={[styles.radioLabel, estaPresente && styles.radioLabelChecked]}>
                        {estaPresente ? 'Presente' : 'Ausente'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum aluno encontrado nesta turma.</Text>
            }
          />

          <TouchableOpacity
            style={styles.btnSalvar}
            onPress={handleSalvarChamada}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnSalvarText}>💾 Salvar Chamada</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* ABA HISTÓRICO */
        <View style={{ flex: 1 }}>
          <View style={styles.subTabContainer}>
            <TouchableOpacity
              style={[
                styles.subTabButton,
                subTabHistorico === 'alunos' && styles.subTabActive,
              ]}
              onPress={() => setSubTabHistorico('alunos')}
            >
              <Text
                style={[
                  styles.subTabText,
                  subTabHistorico === 'alunos' && styles.subTabTextActive,
                ]}
              >
                Alunos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.subTabButton,
                subTabHistorico === 'chamadas' && styles.subTabActive,
              ]}
              onPress={() => setSubTabHistorico('chamadas')}
            >
              <Text
                style={[
                  styles.subTabText,
                  subTabHistorico === 'chamadas' && styles.subTabTextActive,
                ]}
              >
                Chamadas
              </Text>
            </TouchableOpacity>
          </View>

          {subTabHistorico === 'alunos' ? (
            <FlatList
              data={historicoAlunos}
              keyExtractor={(item) => String(item.aluno_id)}
              renderItem={({ item }) => (
                <View style={styles.historicoCard}>
                  <Text style={styles.historicoNome}>{item.nome}</Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statPresenca}>
                      Presenças: [{item.totalPresencas}]
                    </Text>
                    <Text style={styles.statFalta}>
                      Faltas: [{item.totalFaltas}]
                    </Text>
                    <Text style={styles.statPorcentagem}>
                      ({item.porcentagemPresenca}%)
                    </Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <FlatList
              data={historicoChamadas}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.historicoCard}>
                  <Text style={styles.historicoNome}>📅 Data: {item.data}</Text>
                  <Text style={{ color: '#94A3B8', marginBottom: 6, fontSize: 13 }}>
                    Horário: {item.horario} | 📖 Bíblias: {item.qtdBiblias} | 📚 Revistas: {item.qtdRevistas}
                  </Text>
                  <View style={styles.statsRow}>
                    <Text style={styles.statPresenca}>
                      Presentes: [{item.totalPresentes}]
                    </Text>
                    <Text style={styles.statFalta}>
                      Ausentes: [{item.totalAusentes}]
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Sem chamadas registradas.</Text>
              }
            />
          )}
        </View>
      )}

      {/* Modal de Justificativa */}
      <Modal visible={!!alunoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Justificativa de Ausência</Text>
            <Text style={styles.modalSubtitle}>{alunoModal?.nome}</Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Digite o motivo da ausência..."
              placeholderTextColor="#64748B"
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
                style={[styles.modalBtn, { backgroundColor: '#2563EB' }]}
                onPress={salvarJustificativa}
              >
                <Text style={styles.modalBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0F172A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12 },
  labelSection: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  
  classSelector: { maxHeight: 40, marginBottom: 12 },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  classChipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  classChipText: { color: '#94A3B8', fontWeight: '500' },
  classChipTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 8, marginBottom: 12, padding: 2 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabButtonActive: { backgroundColor: '#334155' },
  tabText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#38BDF8', fontWeight: 'bold' },

  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  inputBox: { flex: 0.48 },
  inputLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  datePickerText: { color: '#F8FAFC', fontSize: 14, fontWeight: '500' },
  textInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 14,
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: { color: '#FBBF24', fontWeight: '600', fontSize: 12 },

  alunoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alunoNome: { fontSize: 15, fontWeight: '500', color: '#F8FAFC', flex: 1 },
  alunoAcoes: { flexDirection: 'row', alignItems: 'center' },
  justificativaBadge: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    marginRight: 10,
  },
  justificativaBadgeAtiva: { backgroundColor: '#1E3A8A' },

  radioContainer: { flexDirection: 'row', alignItems: 'center' },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioButtonChecked: { borderColor: '#22C55E' },
  radioButtonInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  radioLabel: { fontSize: 13, color: '#94A3B8' },
  radioLabelChecked: { color: '#22C55E', fontWeight: '600' },

  btnSalvar: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  subTabContainer: { flexDirection: 'row', marginBottom: 12 },
  subTabButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: '#38BDF8' },
  subTabText: { color: '#94A3B8', fontWeight: '500' },
  subTabTextActive: { color: '#38BDF8', fontWeight: 'bold' },

  historicoCard: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historicoNome: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statPresenca: { color: '#4ADE80', fontWeight: '600', fontSize: 13 },
  statFalta: { color: '#F87171', fontWeight: '600', fontSize: 13 },
  statPorcentagem: { color: '#38BDF8', fontWeight: 'bold', fontSize: 13 },

  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  modalSubtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    padding: 10,
    color: '#F8FAFC',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  modalBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});