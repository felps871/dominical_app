import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Importa o cliente do Supabase e o Contexto de Tema (ajuste o caminho se necessário)
import { supabase } from '../supabase';
import { useTheme } from '../context/ThemeContext'; 

export default function GestaoAusentesScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [alunosAusentes, setAlunosAusentes] = useState([]);
  const [filtroAusentes, setFiltroAusentes] = useState('Atencao'); // Começa focado em Atenção
  const [classeFiltroAusentes, setClasseFiltroAusentes] = useState('Todas');
  const [buscaAusentes, setBuscaAusentes] = useState('');

  useEffect(() => {
    carregarAusentesDoSupabase();
  }, []);

  // Função para formatar a data de YYYY-MM-DD para DD/MM/YYYY (Padrão Brasil)
  const formatarDataBR = (dataString) => {
    if (!dataString) return 'N/A';
    const partes = dataString.split('T')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
  };

  // Função para buscar alunos e suas ausências diretamente do Supabase
  const carregarAusentesDoSupabase = async () => {
    try {
      setLoading(true);

      const { data: presencasData, error: errorPresencas } = await supabase
        .from('presenca')
        .select(`
          id,
          aluno_id,
          classe,
          data,
          horario,
          presente,
          justificativa,
          qtd_biblias,
          qtd_revistas,
          alunos (
            id,
            nome
          )
        `)
        .eq('presente', false)
        .order('data', { ascending: false });

      if (errorPresencas) {
        console.error('Detalhe do erro do Supabase:', errorPresencas);
        Alert.alert('Erro do Supabase', errorPresencas.message);
        throw errorPresencas;
      }

      // Processa os dados para agrupar as faltas por aluno
      const mapaAlunos = {};

      presencasData.forEach((item) => {
        const alunoInfo = item.alunos;
        if (!alunoInfo) return;

        const alunoId = alunoInfo.id;

        if (!mapaAlunos[alunoId]) {
          mapaAlunos[alunoId] = {
            id: alunoId,
            nome: alunoInfo.nome || 'Aluno sem nome',
            classe: item.classe || 'Geral',
            faltas: 0,
            ultima: formatarDataBR(item.data)
          };
        }

        mapaAlunos[alunoId].faltas += 1;
      });

      setAlunosAusentes(Object.values(mapaAlunos));

    } catch (error) {
      console.log('Erro ao carregar ausentes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/superintendente');
    }
  };

  // Filtragem focada exclusivamente em Atenção e Risco
  const filtrados = alunosAusentes.filter(aluno => {
    const nomeOK = aluno.nome.toLowerCase().includes(buscaAusentes.toLowerCase().trim());
    const classeOK = classeFiltroAusentes === 'Todas' || aluno.classe.toLowerCase() === classeFiltroAusentes.toLowerCase();
    
    const gravidadeOK = 
      (filtroAusentes === 'Atencao' && aluno.faltas >= 2 && aluno.faltas <= 3) ||
      (filtroAusentes === 'Risco' && aluno.faltas >= 4);

    return nomeOK && classeOK && gravidadeOK;
  });

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC') }
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleVoltar}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
              borderColor: theme.border || (isDarkMode ? '#334155' : '#CBD5E1')
            }
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDarkMode ? '#F8FAFC' : '#0F172A'}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>
            Gestão de Ausentes
          </Text>
          <Text style={[styles.sub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
            Painel de monitoramento e retenção na EBD
          </Text>
        </View>

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

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={[styles.contadorPendentes, { color: '#F59E0B' }]}>
          ⚠️ {filtrados.length} aluno(s) nesta categoria
        </Text>

        <TextInput 
          style={[
            styles.inputBusca,
            {
              backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
              color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A'),
              borderColor: theme.border || (isDarkMode ? '#334155' : '#CBD5E1')
            }
          ]}
          placeholder="Buscar aluno..."
          placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
          value={buscaAusentes}
          onChangeText={setBuscaAusentes}
        />

        {/* Filtros focados apenas em Atenção e Risco */}
        <View style={styles.filtrosRow}>
          {[
            { key: 'Atencao', label: 'Atenção (2-3 faltas)' },
            { key: 'Risco', label: 'Risco de Evasão (4+ faltas)' }
          ].map((filtro) => (
            <TouchableOpacity 
              key={filtro.key}
              style={[
                styles.filtroBtn, 
                filtroAusentes === filtro.key && styles.filtroAtivo,
                { backgroundColor: filtroAusentes === filtro.key ? '#2563EB' : (isDarkMode ? '#1E293B' : '#E2E8F0') }
              ]} 
              onPress={() => setFiltroAusentes(filtro.key)}
            >
              <Text style={[styles.filtroTxt, { color: filtroAusentes === filtro.key ? '#FFF' : (isDarkMode ? '#94A3B8' : '#475569') }]}>
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : filtrados.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
            Nenhum aluno encontrado nesta categoria.
          </Text>
        ) : (
          filtrados.map((aluno, idx) => {
            const iniciais = aluno.nome.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
            const grave = aluno.faltas >= 4;

            return (
              <View 
                key={idx} 
                style={[
                  styles.cardAusente,
                  {
                    backgroundColor: theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF'),
                    borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0')
                  }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iniciaisAvatar, { backgroundColor: isDarkMode ? '#1E3A8A' : '#DBEAFE' }]}>
                    <Text style={[styles.iniciaisTxt, { color: isDarkMode ? '#93C5FD' : '#1E40AF' }]}>{iniciais}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.cardNome, { color: theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A') }]}>{aluno.nome}</Text>
                    <Text style={[styles.cardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Classe: {aluno.classe} • Faltas: {aluno.faltas}</Text>
                    <Text style={[styles.cardSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Última ausência: {aluno.ultima}</Text>
                  </View>
                  <View style={[styles.badgeRisco, { backgroundColor: grave ? '#fde2e2' : '#fff0bd' }]}>
                    <Text style={{ color: grave ? '#b42318' : '#875900', fontSize: 11, fontWeight: 'bold' }}>
                      {grave ? 'Risco' : 'Atenção'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  sub: { marginTop: 2, fontSize: 12 },
  backBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  themeBtn: { padding: 8, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  inputBusca: { width: '100%', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12, fontSize: 14 },
  contadorPendentes: { fontSize: 13, marginBottom: 12, fontWeight: '600' },
  filtrosRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filtroBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  filtroTxt: { fontSize: 12, fontWeight: '600' },
  cardAusente: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iniciaisAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iniciaisTxt: { fontWeight: 'bold', fontSize: 14 },
  cardNome: { fontSize: 16, fontWeight: 'bold' },
  cardSub: { fontSize: 12, marginTop: 2 },
  badgeRisco: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 }
});