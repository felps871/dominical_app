import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Importa o cliente do Supabase e o Contexto de Tema
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext';

function ClassesScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // As quatro classes / submódulos solicitados
  const classesEBD = ['Adultos', 'Jovens', 'Juniores', 'Crianças'];
  
  // Se null, visão geral dos 4 submódulos. Se string, gerenciamento dos alunos daquela classe.
  const [classeSelecionada, setClasseSelecionada] = useState(null);

  const [alunos, setAlunos] = useState([]);
  const [totaisClasses, setTotaisClasses] = useState({
    Adultos: 0,
    Jovens: 0,
    Juniores: 0,
    Crianças: 0,
  });
  const [carregando, setCarregando] = useState(false);

  // Estados do Modal
  const [modalVisivel, setModalVisivel] = useState(false);
  const [alunoEditandoId, setAlunoEditandoId] = useState(null);
  const [novoNome, setNovoNome] = useState('');
  const [novaIdade, setNovaIdade] = useState('');
  const [novaClasse, setNovaClasse] = useState('Adultos');

  // Buscar alunos e calcular a frequência real com base na tabela 'presenca'
  const buscarDados = async () => {
    setCarregando(true);
    
    // 1. Busca os alunos
    const { data: alunosData, error: alunosError } = await supabase.from('alunos').select('*');

    if (alunosError) {
      Alert.alert('Erro Supabase', alunosError.message || 'Não foi possível carregar os alunos.');
      console.error(alunosError);
      setCarregando(false);
      return;
    }

    // 2. Busca todos os registros de presença para calcular o percentual de cada aluno
    const { data: presencaData, error: presencaError } = await supabase.from('presenca').select('*');

    if (presencaError) {
      console.error('Erro ao buscar presenças:', presencaError);
    }

    const listaAlunos = alunosData || [];
    const listaPresencas = presencaData || [];

    // Mapeia contagens totais por classe para os cards do menu principal
    const contagens = { Adultos: 0, Jovens: 0, Juniores: 0, Crianças: 0 };
    listaAlunos.forEach((aluno) => {
      if (contagens[aluno.classe] !== undefined) {
        contagens[aluno.classe] += 1;
      }
    });
    setTotaisClasses(contagens);

    // Se houver uma classe selecionada, calcula a frequência de cada aluno e monta a lista
    if (classeSelecionada) {
      const filtrados = listaAlunos
        .filter((a) => a.classe === classeSelecionada)
        .map((aluno) => {
          // Filtra registros de presença do aluno atual
          const presencasDoAluno = listaPresencas.filter((p) => p.aluno_id === aluno.id);
          const totalAulas = presencasDoAluno.length;

          let porcentagem = 100; // Valor padrão caso não tenha nenhuma chamada registrada ainda
          if (totalAulas > 0) {
            const totalPresentes = presencasDoAluno.filter((p) => p.presente === true).length;
            porcentagem = Math.round((totalPresentes / totalAulas) * 100);
          }

          return {
            ...aluno,
            frequencia: porcentagem,
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setAlunos(filtrados);
    }

    setCarregando(false);
  };

  useEffect(() => {
    buscarDados();
  }, [classeSelecionada]);

  const handleAbrirModalNovo = () => {
    setAlunoEditandoId(null);
    setNovoNome('');
    setNovaIdade('');
    setNovaClasse(classeSelecionada || 'Adultos');
    setModalVisivel(true);
  };

  const handleAbrirModalEditar = (aluno) => {
    setAlunoEditandoId(aluno.id);
    setNovoNome(aluno.nome || '');
    setNovaIdade(aluno.idade !== null && aluno.idade !== undefined ? String(aluno.idade) : '');
    setNovaClasse(aluno.classe || 'Adultos');
    setModalVisivel(true);
  };

  const handleSalvarAluno = async () => {
    if (!novoNome.trim()) {
      Alert.alert('Atenção', 'Por favor, digite o nome do aluno.');
      return;
    }

    if (!novaClasse.trim()) {
      Alert.alert('Atenção', 'Por favor, informe a classe do aluno.');
      return;
    }

    const payload = {
      nome: novoNome.trim(),
      idade: novaIdade.trim() ? parseInt(novaIdade.trim(), 10) : null,
      classe: novaClasse.trim(),
    };

    if (alunoEditandoId) {
      const { error } = await supabase
        .from('alunos')
        .update(payload)
        .eq('id', alunoEditandoId);

      if (error) {
        Alert.alert('Erro ao atualizar', error.message);
      } else {
        Alert.alert('Sucesso', 'Aluno atualizado com sucesso!');
        setModalVisivel(false);
        buscarDados();
      }
    } else {
      const { error } = await supabase.from('alunos').insert([payload]);

      if (error) {
        Alert.alert('Erro ao salvar', error.message);
      } else {
        Alert.alert('Sucesso', 'Aluno cadastrado com sucesso!');
        setModalVisivel(false);
        buscarDados();
      }
    }
  };

  const handleConfirmarExclusao = (id, nome) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente remover ${nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('alunos').delete().eq('id', id);
            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              buscarDados();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC') }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (classeSelecionada) {
              setClasseSelecionada(null);
            } else {
              router.back();
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A')} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
          {classeSelecionada ? `Submódulo: ${classeSelecionada}` : 'Submódulos de Classes'}
        </Text>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeBtn,
            { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', borderColor: theme.border || '#CBD5E1' }
          ]}
        >
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={20}
            color={isDarkMode ? '#F59E0B' : '#6366F1'}
          />
        </TouchableOpacity>
      </View>

      {!classeSelecionada ? (
        <ScrollView contentContainerStyle={styles.submodulosGrid}>
          <Text style={[styles.instructionText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Selecione um submódulo para gerenciar os alunos da respectiva classe:
          </Text>

          {classesEBD.map((classe) => {
            const totalAlunos = totaisClasses[classe] || 0;
            return (
              <TouchableOpacity
                key={classe}
                style={[
                  styles.submoduloCard,
                  {
                    backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFF'),
                    borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0'),
                  }
                ]}
                onPress={() => setClasseSelecionada(classe)}
                activeOpacity={0.7}
              >
                <View style={styles.alunosBadgeContainer}>
                  <Text style={styles.alunosBadgeNumber}>{totalAlunos}</Text>
                  <Text style={styles.alunosBadgeLabel}>ALUNOS</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.submoduloCardTitle, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
                    Classe {classe}
                  </Text>
                  <Text style={[styles.submoduloCardSubtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Toque para gerenciar os alunos
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.subTitle, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
              Alunos • <Text style={{ color: '#2563EB' }}>{classeSelecionada}</Text>{' '}
              <Text style={styles.contadorBadge}>({alunos.length})</Text>
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAbrirModalNovo}>
              <Ionicons name="person-add-outline" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={alunos}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={isDarkMode ? '#475569' : '#94A3B8'} />
                  <Text style={[styles.emptyText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                    Nenhum aluno cadastrado neste submódulo.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const frequenciaPercentual = item.frequencia !== undefined ? item.frequencia : 100;

                return (
                  <View
                    style={[
                      styles.alunoCard,
                      {
                        backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFF'),
                        borderColor: theme.border || (isDarkMode ? '#334155' : 'transparent'),
                        borderWidth: isDarkMode ? 1 : 0,
                      }
                    ]}
                  >
                    {/* Roda / Indicador de Porcentagem de Frequência Real ao lado do nome */}
                    <View style={styles.frequenciaBadgeContainer}>
                      <Text style={styles.frequenciaNumber}>{frequenciaPercentual}%</Text>
                      <Text style={styles.frequenciaLabel}>FREQ.</Text>
                    </View>

                    {/* Nome em cima e detalhes (idade) abaixo */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.alunoNome, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
                        {item.nome}
                      </Text>
                      <Text style={[styles.alunoDetalhe, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                        {item.idade !== null && item.idade !== undefined
                          ? `Idade: ${item.idade} anos`
                          : 'Idade: Não informada'}
                      </Text>
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity onPress={() => handleAbrirModalEditar(item)} style={styles.iconBtn}>
                        <Ionicons name="pencil-outline" size={20} color={isDarkMode ? '#60A5FA' : '#2563EB'} />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleConfirmarExclusao(item.id, item.nome)} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Modal / Formulário */}
      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalCard,
            { backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFF') }
          ]}>
            <Text style={[styles.modalTitle, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
              {alunoEditandoId ? 'Editar Aluno' : 'Novo Aluno no Submódulo'}
            </Text>

            <TextInput
              placeholder="Nome completo do aluno"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={novoNome}
              onChangeText={setNovoNome}
              style={[
                styles.input,
                {
                  color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A'),
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                  backgroundColor: isDarkMode ? '#0F172A' : '#FFF'
                }
              ]}
            />

            <TextInput
              placeholder="Idade (opcional)"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              keyboardType="numeric"
              value={novaIdade}
              onChangeText={setNovaIdade}
              style={[
                styles.input,
                {
                  color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A'),
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                  backgroundColor: isDarkMode ? '#0F172A' : '#FFF'
                }
              ]}
            />

            <TextInput
              placeholder="Submódulo / Classe (Adultos, Jovens...)"
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={novaClasse}
              onChangeText={setNovaClasse}
              style={[
                styles.input,
                {
                  color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A'),
                  borderColor: isDarkMode ? '#334155' : '#CBD5E1',
                  backgroundColor: isDarkMode ? '#0F172A' : '#FFF'
                }
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.cancelBtn,
                  { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }
                ]}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={[styles.cancelBtnText, { color: isDarkMode ? '#CBD5E1' : '#64748B' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSalvarAluno}
              >
                <Text style={styles.saveBtnText}>
                  {alunoEditandoId ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ClassesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  backBtn: { paddingRight: 12 },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  themeBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  instructionText: { fontSize: 14, marginBottom: 16 },
  submodulosGrid: { paddingBottom: 20 },
  submoduloCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 1,
  },
  submoduloCardTitle: { fontSize: 16, fontWeight: 'bold' },
  submoduloCardSubtitle: { fontSize: 12, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subTitle: { fontSize: 16, fontWeight: 'bold' },
  contadorBadge: { color: '#2563EB', fontWeight: 'bold' },
  addBtn: { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  alunoCard: { padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
  alunosBadgeContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#FFEDD5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  alunosBadgeNumber: {
    color: '#C2410C',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alunosBadgeLabel: {
    color: '#C2410C',
    fontSize: 9,
    fontWeight: 'bold',
  },
  frequenciaBadgeContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  frequenciaNumber: {
    color: '#0369A1',
    fontWeight: 'bold',
    fontSize: 11,
  },
  frequenciaLabel: {
    color: '#0369A1',
    fontSize: 8,
    fontWeight: 'bold',
  },
  alunoNome: { fontSize: 15, fontWeight: 'bold' },
  alunoDetalhe: { fontSize: 12, marginTop: 2 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginLeft: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  cancelBtnText: { fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#2563EB' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});