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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Importa o cliente do Supabase
import { supabase } from '../supabase';

function ClassesScreen() {
  const router = useRouter();

  const classesEBD = ['Jovens', 'Adultos', 'Juniores', 'Crianças'];
  const [classeSelecionada, setClasseSelecionada] = useState('Jovens');

  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // Estados do Modal
  const [modalVisivel, setModalVisivel] = useState(false);
  const [alunoEditandoId, setAlunoEditandoId] = useState(null);
  const [novoNome, setNovoNome] = useState('');
  const [novaIdade, setNovaIdade] = useState('');
  const [novaClasse, setNovaClasse] = useState('');

  // 1. Procurar alunos no Supabase
  const buscarAlunos = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('classe', classeSelecionada)
      .order('nome', { ascending: true });

    if (error) {
      Alert.alert('Erro Supabase', error.message || 'Não foi possível carregar os alunos.');
      console.error(error);
    } else {
      setAlunos(data || []);
    }
    setCarregando(false);
  };

  useEffect(() => {
    buscarAlunos();
  }, [classeSelecionada]);

  // 2. Limpar formulário e abrir Modal (Novo Aluno)
  const handleAbrirModalNovo = () => {
    setAlunoEditandoId(null);
    setNovoNome('');
    setNovaIdade('');
    setNovaClasse(classeSelecionada);
    setModalVisivel(true);
  };

  // 3. Preencher formulário e abrir Modal (Editar Aluno)
  const handleAbrirModalEditar = (aluno) => {
    setAlunoEditandoId(aluno.id);
    setNovoNome(aluno.nome || '');
    setNovaIdade(aluno.idade !== null && aluno.idade !== undefined ? String(aluno.idade) : '');
    setNovaClasse(aluno.classe || classeSelecionada);
    setModalVisivel(true);
  };

  // 4. Criar ou Atualizar Aluno
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
        console.error(error);
      } else {
        Alert.alert('Sucesso', 'Aluno atualizado com sucesso!');
        setModalVisivel(false);
        buscarAlunos();
      }
    } else {
      const { error } = await supabase.from('alunos').insert([payload]);

      if (error) {
        Alert.alert('Erro ao salvar', error.message);
        console.error(error);
      } else {
        Alert.alert('Sucesso', 'Aluno cadastrado com sucesso!');
        setModalVisivel(false);
        buscarAlunos();
      }
    }
  };

  // 5. Excluir Aluno
  const handleConfirmarExclusao = (id, nome) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente remover ${nome} da classe?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('alunos').delete().eq('id', id);

            if (error) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir o aluno.');
              console.error(error);
            } else {
              buscarAlunos();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestão de Classes</Text>
      </View>

      {/* Abas das Classes */}
      <View style={styles.tabsContainer}>
        {classesEBD.map((classe) => {
          const ativa = classe === classeSelecionada;
          return (
            <TouchableOpacity
              key={classe}
              style={[styles.tab, ativa && styles.tabAtiva]}
              onPress={() => setClasseSelecionada(classe)}
            >
              <Text style={[styles.tabText, ativa && styles.tabTextAtivo]}>
                {classe}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Seção da Lista */}
      <View style={styles.sectionHeader}>
        <Text style={styles.subTitle}>
          Alunos de <Text style={{ color: '#2563EB' }}>{classeSelecionada}</Text>
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAbrirModalNovo}>
          <Ionicons name="person-add-outline" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Alunos vinda do Supabase */}
      {carregando ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={alunos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>Nenhum aluno cadastrado nesta classe.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.alunoCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.nome ? item.nome.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alunoNome}>{item.nome}</Text>
                <Text style={styles.alunoDetalhe}>
                  {item.idade !== null && item.idade !== undefined
                    ? `Idade: ${item.idade} anos`
                    : 'Idade: Não informada'}{' '}
                  • Classe: {item.classe}
                </Text>
              </View>

              {/* Botões de Ação */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => handleAbrirModalEditar(item)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil-outline" size={20} color="#2563EB" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleConfirmarExclusao(item.id, item.nome)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal / Formulário */}
      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {alunoEditandoId ? 'Editar Aluno' : 'Novo Aluno'}
            </Text>

            <TextInput
              placeholder="Nome completo do aluno"
              placeholderTextColor="#94A3B8"
              value={novoNome}
              onChangeText={setNovoNome}
              style={styles.input}
            />

            <TextInput
              placeholder="Idade (opcional)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={novaIdade}
              onChangeText={setNovaIdade}
              style={styles.input}
            />

            <TextInput
              placeholder="Classe (ex: Jovens, Adultos...)"
              placeholderTextColor="#94A3B8"
              value={novaClasse}
              onChangeText={setNovaClasse}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
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

// Export default obrigatório para o Expo Router
export default ClassesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  backBtn: { paddingRight: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, backgroundColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  tabAtiva: { backgroundColor: '#2563EB' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextAtivo: { color: '#FFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  addBtn: { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  alunoCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#2563EB', fontWeight: 'bold', fontSize: 16 },
  alunoNome: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  alunoDetalhe: { fontSize: 12, color: '#64748B', marginTop: 2 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginLeft: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, color: '#0F172A' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#2563EB' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});