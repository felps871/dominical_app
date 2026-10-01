import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../supabase';

export default function CadastrarLicao() {
  const router = useRouter();
  const [classe, setClasse] = useState('Jovens');
  
  // Estados para Data do Cadastro (com Picker)
  const [dataLicao, setDataLicao] = useState(new Date());
  const [showPickerCadastro, setShowPickerCadastro] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [professor, setProfessor] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para Exclusão de Lições Passadas (com Picker)
  const [dataCorte, setDataCorte] = useState(new Date());
  const [showPickerCorte, setShowPickerCorte] = useState(false);
  const [loadingExcluir, setLoadingExcluir] = useState(false);

  // Formata objeto Date em "DD/MM/AAAA" para exibição
  const formatarDataParaExibicao = (dateObj) => {
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // Formata a string ISO "YYYY-MM-DD" do Supabase para "DD/MM/AAAA"
  const formatarDataISOparaBR = (dataString) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Formata objeto Date em "YYYY-MM-DD" para salvar no Supabase
  const formatarDataParaISO = (dateObj) => {
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const ano = dateObj.getFullYear();
    return `${ano}-${mes}-${dia}`;
  };

  const onChangeDataCadastro = (event, selectedDate) => {
    setShowPickerCadastro(Platform.OS === 'ios');
    if (selectedDate) {
      setDataLicao(selectedDate);
    }
  };

  const onChangeDataCorte = (event, selectedDate) => {
    setShowPickerCorte(Platform.OS === 'ios');
    if (selectedDate) {
      setDataCorte(selectedDate);
    }
  };

  const handleSalvar = async () => {
    if (!titulo || !professor) {
      Alert.alert('Atenção', 'Por favor, preencha o título e o professor!');
      return;
    }

    setLoading(true);

    const dataFormatadaISO = formatarDataParaISO(dataLicao);

    const { error } = await supabase.from('licoes').insert([
      { 
        classe, 
        data: dataFormatadaISO, 
        titulo, 
        professor
      }
    ]);

    setLoading(false);

    if (error) {
      Alert.alert('Erro', 'Erro ao salvar lição: ' + error.message);
    } else {
      Alert.alert('Sucesso 🎉', `Lição da classe ${classe} cadastrada com sucesso!`);
      setTitulo('');
      setProfessor('');
      setDataLicao(new Date());
    }
  };

  const handleExcluirLicoesPassadas = () => {
    const dataCorteExibicao = formatarDataParaExibicao(dataCorte);
    const dataCorteISO = formatarDataParaISO(dataCorte);

    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja EXCLUIR permanentemente do banco de dados todas as lições com data anterior a ${dataCorteExibicao}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sim, Excluir', 
          style: 'destructive',
          onPress: async () => {
            setLoadingExcluir(true);
            
            const { data: dataDeletada, error } = await supabase
              .from('licoes')
              .delete()
              .lt('data', dataCorteISO)
              .select();

            setLoadingExcluir(false);

            if (error) {
              Alert.alert('Erro', 'Erro ao excluir lições: ' + error.message);
            } else if (!dataDeletada || dataDeletada.length === 0) {
              Alert.alert(
                'Nenhuma lição encontrada',
                `Nenhuma lição foi encontrada com data anterior a ${dataCorteExibicao}.`
              );
            } else {
              Alert.alert('Sucesso 🎉', `${dataDeletada.length} lição(ões) antiga(s) foi(ram) excluída(s) com sucesso!`);
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar Lição</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Seleção de Turma */}
        <Text style={styles.label}>Selecione a Classe:</Text>
        <View style={styles.botoesClasse}>
          {['Jovens', 'Adultos', 'Juniores', 'Crianças'].map((item) => (
            <TouchableOpacity 
              key={item} 
              style={[styles.btnClasse, classe === item && styles.btnAtivo]}
              onPress={() => setClasse(item)}
            >
              <Text style={[styles.btnTexto, classe === item && styles.btnTextoAtivo]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Seleção de Data por Calendário */}
        <Text style={styles.label}>Data da Lição:</Text>
        <TouchableOpacity 
          style={styles.datePickerButton} 
          onPress={() => setShowPickerCadastro(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#38BDF8" />
          <Text style={styles.datePickerButtonText}>
            {formatarDataParaExibicao(dataLicao)}
          </Text>
        </TouchableOpacity>

        {showPickerCadastro && (
          <DateTimePicker
            value={dataLicao}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDataCadastro}
          />
        )}

        <Text style={styles.label}>Título da Lição:</Text>
        <TextInput 
          style={styles.input} 
          value={titulo} 
          onChangeText={setTitulo} 
          placeholder="Ex: O Poder da Oração" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.label}>Nome do Professor / Pregador:</Text>
        <TextInput 
          style={styles.input} 
          value={professor} 
          onChangeText={setProfessor} 
          placeholder="Ex: Prof. João" 
          placeholderTextColor="#94A3B8" 
        />

        {/* Botão de Salvar */}
        <TouchableOpacity 
          style={styles.btnSalvar} 
          onPress={handleSalvar} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnSalvarTexto}>Cadastrar Lição</Text>
          )}
        </TouchableOpacity>

        {/* ================= SEÇÃO DE EXCLUSÃO DE LIÇÕES ANTIGAS ================= */}
        <View style={styles.dangerZoneContainer}>
          <View style={styles.dangerZoneHeader}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.dangerZoneTitle}>Gerenciar / Limpar Lições Passadas</Text>
          </View>
          <Text style={styles.dangerZoneSubtext}>
            Remova do banco de dados as lições antigas que já foram ministradas para manter o aplicativo dos alunos organizado.
          </Text>

          <Text style={styles.label}>Excluir lições anteriores a:</Text>
          <TouchableOpacity 
            style={styles.datePickerButton} 
            onPress={() => setShowPickerCorte(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#EF4444" />
            <Text style={styles.datePickerButtonText}>
              {formatarDataParaExibicao(dataCorte)}
            </Text>
          </TouchableOpacity>

          {showPickerCorte && (
            <DateTimePicker
              value={dataCorte}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDataCorte}
            />
          )}

          <TouchableOpacity 
            style={styles.btnExcluir} 
            onPress={handleExcluirLicoesPassadas}
            disabled={loadingExcluir}
          >
            {loadingExcluir ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.btnExcluirContent}>
                <Ionicons name="trash-bin-outline" size={18} color="#FFF" />
                <Text style={styles.btnExcluirTexto}>Excluir Lições Anteriores</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F172A' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16 
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  content: { 
    padding: 20 
  },
  label: { 
    color: '#CBD5E1', 
    fontSize: 14, 
    marginTop: 15, 
    marginBottom: 6, 
    fontWeight: '600' 
  },
  input: { 
    backgroundColor: '#1E293B', 
    color: '#FFF', 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16 
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  datePickerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  botoesClasse: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginTop: 5 
  },
  btnClasse: { 
    backgroundColor: '#1E293B', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8 
  },
  btnAtivo: { 
    backgroundColor: '#2563EB' 
  },
  btnTexto: { 
    color: '#94A3B8', 
    fontWeight: 'bold' 
  },
  btnTextoAtivo: { 
    color: '#FFF' 
  },
  btnSalvar: { 
    backgroundColor: '#16A34A', 
    padding: 16, 
    borderRadius: 10, 
    marginTop: 25, 
    alignItems: 'center' 
  },
  btnSalvarTexto: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  dangerZoneContainer: {
    marginTop: 35,
    padding: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dangerZoneTitle: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dangerZoneSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  btnExcluir: {
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  btnExcluirContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnExcluirTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});