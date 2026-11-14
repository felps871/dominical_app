import React, { useState, useEffect, useCallback } from 'react';
import {  
  View,  
  Text,  
  TextInput,  
  TouchableOpacity,  
  StyleSheet,  
  Alert,  
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

export default function FinancialEntryScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [type, setType] = useState('entrada');
  const [amountRaw, setAmountRaw] = useState('');
  const [formattedDisplay, setFormattedDisplay] = useState('R$ 0,00');
  const [selectedQuarterInput, setSelectedQuarterInput] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Filtro de exibição no topo ('todos' ou 1, 2, 3, 4)
  const [filterQuarter, setFilterQuarter] = useState('todos');
  const [records, setRecords] = useState([]);

  // Carregar registros do Supabase
  const carregarRegistros = useCallback(async () => {
    try {
      setLoadingData(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Erro ao carregar finanças:', error.message);
      } else {
        setRecords(data || []);
      }
    } catch (error) {
      console.log('Erro:', error.message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  // Formatação monetária com centavos automáticos
  const handleCurrencyChange = (text) => {
    const numbersOnly = text.replace(/\D/g, '');
    setAmountRaw(numbersOnly);

    if (!numbersOnly) {
      setFormattedDisplay('R$ 0,00');
      return;
    }

    const numericValue = parseFloat(numbersOnly) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    setFormattedDisplay(formatted);
  };

  const handleSave = async () => {
    if (!amountRaw || parseInt(amountRaw) === 0 || !year) {
      Alert.alert('Erro', 'Preencha o valor e o ano corretamente.');
      return;
    }

    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }

      const numericAmount = parseFloat(amountRaw) / 100;

      const novoLancamento = {
        user_id: user.id,
        type,
        amount: numericAmount,
        formatted_amount: formattedDisplay,
        quarter: selectedQuarterInput,
        year: parseInt(year),
        description: description || 'Sem descrição',
      };

      const { error } = await supabase.from('financeiro').insert([novoLancamento]);

      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Sucesso 🎉', 'Lançamento salvo com sucesso!');
        setAmountRaw('');
        setFormattedDisplay('R$ 0,00');
        setDescription('');
        carregarRegistros();
      }
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Limpar Dados',
      'Deseja apagar todos os seus registros financeiros?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {  
          text: 'Sim, apagar',  
          style: 'destructive',
          onPress: async () => {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            if (!user) return;

            const { error } = await supabase.from('financeiro').delete().eq('user_id', user.id);
            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              setRecords([]);
            }
          }
        }
      ]
    );
  };

  // Filtragem dos registros com base no filtro selecionado no topo
  const filteredRecords = records.filter(item => {
    if (filterQuarter === 'todos') return true;
    return item.quarter === filterQuarter;
  });

  // Cálculos financeiros baseados nos registros filtrados
  const totalEntrada = filteredRecords
    .filter(r => r.type === 'entrada')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const totalSaida = filteredRecords
    .filter(r => r.type === 'saida')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  const saldoLiquido = totalEntrada - totalSaida;

  // Cores Dinâmicas Baseadas no Tema
  const corFundo = isDarkMode ? '#0F172A' : '#F8FAFC';
  const corCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const corBorda = isDarkMode ? '#334155' : '#E2E8F0';
  const corTexto = isDarkMode ? '#F8FAFC' : '#0F172A';
  const corSub = isDarkMode ? '#94A3B8' : '#64748B';
  const corInputBg = isDarkMode ? '#0F172A' : '#FAFAFA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: corFundo }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* Header com Botão de Voltar */}
      <View style={[styles.headerBar, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financeiro - EBD</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Seletor de Filtro por Trimestre */}
        <View style={styles.filterContainer}>
          <Text style={[styles.filterLabel, { color: corSub }]}>Filtrar:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity  
              style={[
                styles.filterTab, 
                { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' },
                filterQuarter === 'todos' && styles.filterTabActive
              ]}
              onPress={() => setFilterQuarter('todos')}
            >
              <Text style={[styles.filterTabText, { color: corTexto }, filterQuarter === 'todos' && styles.filterTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            {[1, 2, 3, 4].map(q => (
              <TouchableOpacity  
                key={q}
                style={[
                  styles.filterTab, 
                  { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' },
                  filterQuarter === q && styles.filterTabActive
                ]}
                onPress={() => setFilterQuarter(q)}
              >
                <Text style={[styles.filterTabText, { color: corTexto }, filterQuarter === q && styles.filterTextActive]}>
                  {q}º Trim
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Cards de Resumo */}
        <View style={styles.summaryContainer}>
          <View style={[styles.card, { backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.15)' : '#e6f4ea', borderColor: isDarkMode ? '#16a34a' : 'transparent', borderWidth: isDarkMode ? 1 : 0 }]}>
            <Text style={[styles.cardLabel, { color: corSub }]}>Entradas</Text>
            <Text style={[styles.cardValue, { color: '#22c55e' }]}>
              {totalEntrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fce8e6', borderColor: isDarkMode ? '#ef4444' : 'transparent', borderWidth: isDarkMode ? 1 : 0 }]}>
            <Text style={[styles.cardLabel, { color: corSub }]}>Saídas</Text>
            <Text style={[styles.cardValue, { color: '#ef4444' }]}>
              - {totalSaida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>

        {/* Card de Saldo Líquido */}
        <View style={[styles.balanceCard, { backgroundColor: saldoLiquido >= 0 ? (isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#e8f0fe') : (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fde8e8'), borderColor: saldoLiquido >= 0 ? '#2563eb' : '#ef4444', borderWidth: 1 }]}>
          <Text style={[styles.balanceLabel, { color: corTexto }]}>
            Saldo Líquido ({filterQuarter === 'todos' ? 'Geral' : `${filterQuarter}º Trimestre`})
          </Text>
          <Text style={[styles.balanceValue, { color: saldoLiquido >= 0 ? '#3b82f6' : '#ef4444' }]}>
            {saldoLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>

        {/* Formulário */}
        <View style={[styles.formCard, { backgroundColor: corCard, borderColor: corBorda, borderWidth: isDarkMode ? 0 : 1 }]}>
          <Text style={[styles.title, { color: corTexto }]}>Novo Lançamento Trimestral</Text>
          
          <View style={styles.rowType}>
            <TouchableOpacity  
              style={[styles.typeButton, { borderColor: corBorda }, type === 'entrada' && styles.activeEntrada]}  
              onPress={() => setType('entrada')}
            >
              <Text style={[styles.typeButtonText, { color: corSub }, type === 'entrada' && styles.activeText]}>Entrada</Text>
            </TouchableOpacity>

            <TouchableOpacity  
              style={[styles.typeButton, { borderColor: corBorda }, type === 'saida' && styles.activeSaida]}  
              onPress={() => setType('saida')}
            >
              <Text style={[styles.typeButtonText, { color: corSub }, type === 'saida' && styles.activeText]}>Saída (Retirada)</Text>
            </TouchableOpacity>
          </View>

          {/* Input Formatado de Dinheiro */}
          <TextInput
            style={[styles.input, { backgroundColor: corInputBg, color: corTexto, borderColor: corBorda }]}
            placeholder="Valor (R$)"
            placeholderTextColor={corSub}
            keyboardType="numeric"
            value={formattedDisplay}
            onChangeText={handleCurrencyChange}
          />

          {/* Seletor Visual de Trimestre para o Cadastro (Pílulas) */}
          <Text style={[styles.inputLabel, { color: corSub }]}>Selecione o Trimestre do Lançamento:</Text>
          <View style={styles.quarterPickerRow}>
            {[1, 2, 3, 4].map(q => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.quarterOption, 
                  { backgroundColor: isDarkMode ? '#334155' : '#f5f5f5', borderColor: corBorda },
                  selectedQuarterInput === q && styles.quarterOptionActive
                ]}
                onPress={() => setSelectedQuarterInput(q)}
              >
                <Text style={[styles.quarterOptionText, { color: corSub }, selectedQuarterInput === q && styles.quarterOptionTextActive]}>
                  {q}º Trim
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: corInputBg, color: corTexto, borderColor: corBorda }]}
            placeholder="Ano (ex: 2026)"
            placeholderTextColor={corSub}
            keyboardType="numeric"
            maxLength={4}
            value={year}
            onChangeText={setYear}
          />

          <TextInput
            style={[styles.input, { backgroundColor: corInputBg, color: corTexto, borderColor: corBorda }]}
            placeholder="Descrição (opcional)"
            placeholderTextColor={corSub}
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar Lançamento</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Cabeçalho da Lista + Botão de Limpar */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.sectionTitle, { color: corTexto }]}>Histórico ({filteredRecords.length})</Text>
          {records.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearText}>Limpar Tudo</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingData ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 20 }} />
        ) : filteredRecords.length === 0 ? (
          <Text style={[styles.emptyText, { color: corSub }]}>Nenhum registro encontrado para este filtro.</Text>
        ) : (
          filteredRecords.map((item) => (
            <View 
              key={item.id} 
              style={[
                styles.listItem, 
                { 
                  backgroundColor: corCard, 
                  borderColor: corBorda,
                  borderLeftColor: item.type === 'entrada' ? '#22c55e' : '#ef4444',
                  borderWidth: isDarkMode ? 0 : 1
                }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.listDescription, { color: corTexto }]}>{item.description}</Text>
                <Text style={[styles.listSubText, { color: corSub }]}>{item.quarter}º Trimestre / {item.year}</Text>
              </View>
              <Text style={[styles.listAmount, { color: item.type === 'entrada' ? '#22c55e' : '#ef4444' }]}>
                {item.type === 'entrada' ? '+' : '-'} {item.formatted_amount}
              </Text>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  filterLabel: { fontSize: 13, fontWeight: '600', marginRight: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 6 },
  filterTabActive: { backgroundColor: '#2563EB' },
  filterTabText: { fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: 'bold' },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  card: { flex: 1, padding: 12, borderRadius: 12, marginHorizontal: 3, alignItems: 'center' },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 15, fontWeight: 'bold' },
  balanceCard: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  balanceLabel: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  balanceValue: { fontSize: 18, fontWeight: 'bold' },
  formCard: { padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  rowType: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeButton: { flex: 1, padding: 10, borderWidth: 1, alignItems: 'center', borderRadius: 8, marginHorizontal: 4 },
  activeEntrada: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  activeSaida: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  typeButtonText: { fontWeight: 'bold', fontSize: 13 },
  activeText: { color: '#fff' },
  input: { borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8, fontSize: 14 },
  inputLabel: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  quarterPickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quarterOption: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  quarterOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  quarterOptionText: { fontSize: 12, fontWeight: '600' },
  quarterOptionTextActive: { color: '#fff', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#2563EB', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold' },
  clearText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginBottom: 8, alignItems: 'center', borderLeftWidth: 4 },
  listDescription: { fontSize: 14, fontWeight: '600' },
  listSubText: { fontSize: 11, marginTop: 2 },
  listAmount: { fontSize: 15, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 16, fontStyle: 'italic', fontSize: 13 }
});