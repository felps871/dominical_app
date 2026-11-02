import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
  TextInput
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

  // Dados do perfil (tabela "users")
  const [perfilVisivel, setPerfilVisivel] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState({
    nome: '',
    classe: '',
    email: '',
  });

  // Troca de senha dentro do app
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

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

  // Dados exibidos no perfil (prioriza "alunos", depois "users")
  const nomePerfil = perfilAluno?.nome || perfilUsuario.nome || 'Aluno';
  const classePerfil = perfilAluno?.classe || perfilUsuario.classe || 'Aluno';
  const inicial = String(nomePerfil).trim().charAt(0).toUpperCase() || 'A';

  useEffect(() => {
    carregarDadosAluno();
  }, []);

  const carregarDadosAluno = async () => {
    try {
      setLoading(true);

      // 1. Obtém o usuário autenticado no Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      let alunoEncontrado = null;

      if (user) {
        // Busca o registro na tabela "users" (usado no perfil e como fallback)
        const { data: userProfile, error: errorUsers } = await supabase
          .from('users')
          .select('nome, email, classe')
          .eq('id', user.id)
          .maybeSingle();

        if (errorUsers) console.log('Erro ao buscar users:', errorUsers.message);

        setPerfilUsuario({
          nome: userProfile?.nome || '',
          classe: userProfile?.classe || '',
          email: userProfile?.email || user.email || '',
        });

        // TENTATIVA 1: Busca direta na tabela 'alunos' usando o user_id
        const { data: alunoPorId } = await supabase
          .from('alunos')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (alunoPorId) {
          alunoEncontrado = alunoPorId;
        } else if (userProfile && userProfile.nome) {
          // TENTATIVA 2 (FALLBACK): busca por nome
          const primeiroNome = userProfile.nome.trim().split(' ')[0];

          const { data: alunosData } = await supabase
            .from('alunos')
            .select('*')
            .ilike('nome', `%${primeiroNome}%`)
            .limit(1);

          if (alunosData && alunosData.length > 0) {
            alunoEncontrado = alunosData[0];
          }
        }
      }

      // Se encontrou o aluno na tabela 'alunos':
      if (alunoEncontrado) {
        // AUTO-VINCULAÇÃO: Se o user_id ainda estava NULL, grava o ID do login no banco
        if (!alunoEncontrado.user_id && user) {
          await supabase
            .from('alunos')
            .update({ user_id: user.id })
            .eq('id', alunoEncontrado.id);
          
          alunoEncontrado.user_id = user.id; // Atualiza o estado local
        }

        setPerfilAluno(alunoEncontrado);

        // Busca a frequência na tabela 'presenca' usando o ID numérico (bigint)
        await fetchFrequencia(alunoEncontrado.id);

        // Busca as lições filtradas pela classe do aluno
        await fetchLicoes(alunoEncontrado.classe);
      } else {
        console.warn('Registro de aluno não localizado na tabela alunos.');
        await fetchLicoes(null); // Traz todas as lições como fallback
      }

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

  const fetchFrequencia = async (alunoIdNumerico) => {
    try {
      console.log('Buscando frequência para o aluno ID:', alunoIdNumerico);

      const { data: presencas, error } = await supabase
        .from('presenca')
        .select('*')
        .eq('aluno_id', alunoIdNumerico);

      if (error) {
        console.log('Erro ao buscar presenças no Supabase:', error.message);
        return;
      }

      if (!presencas || presencas.length === 0) {
        console.log('Nenhum registro de presença encontrado para este aluno.');
        return;
      }

      const agora = new Date();
      const mesAtual = agora.getMonth() + 1; // getMonth() vai de 0 a 11
      const anoAtual = agora.getFullYear();

      // Filtro seguro por string de data para evitar problemas de fuso horário do JS
      const presencasMes = presencas.filter((item) => {
        if (!item.data) return false;
        const [anoStr, mesStr] = item.data.split('T')[0].split('-');
        return parseInt(mesStr, 10) === mesAtual && parseInt(anoStr, 10) === anoAtual;
      });

      const presencasAno = presencas.filter((item) => {
        if (!item.data) return false;
        const [anoStr] = item.data.split('T')[0].split('-');
        return parseInt(anoStr, 10) === anoAtual;
      });

      const totaisMes = presencasMes.length;
      const presentesMes = presencasMes.filter(p => p.presente === true).length;
      const pctMes = totaisMes > 0 ? Math.round((presentesMes / totaisMes) * 100) : 0;

      const totaisAno = presencasAno.length;
      const presentesAno = presencasAno.filter(p => p.presente === true).length;
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
      console.error('Erro crítico ao processar frequência:', err);
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

  // ---------- Ações do perfil ----------
  const abrirPerfil = () => setPerfilVisivel(true);

  const fecharPerfil = () => {
    setPerfilVisivel(false);
    setSenhaVisivel(false);
    setNovaSenha('');
    setConfirmarSenha('');
  };

  const alterarSenha = () => setSenhaVisivel(!senhaVisivel);

  const salvarNovaSenha = async () => {
    if (novaSenha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      Alert.alert('Atenção', 'As senhas não conferem.');
      return;
    }

    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso 🎉', 'Senha alterada com sucesso!');
      setNovaSenha('');
      setConfirmarSenha('');
      setSenhaVisivel(false);
    }
  };

  const sair = () => {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          fecharPerfil();
          router.replace('/');
        },
      },
    ]);
  };

  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#334155' : '#E2E8F0');
  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const corSub = theme.subtext || (isDarkMode ? '#94A3B8' : '#64748B');
  const corIconeBox = isDarkMode ? '#334155' : '#E2E8F0';

  const badgeMes = getBadgeAssiduidade(frequencia.mes);
  const badgeAno = getBadgeAssiduidade(frequencia.ano);

  return (
    <LinearGradient colors={gradientColors} style={styles.background}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <SafeAreaView style={{ flex: 1 }}>
        {/* TOPO: TEMA + AVATAR DE PERFIL */}
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

          {/* Avatar de Perfil */}
          <TouchableOpacity onPress={abrirPerfil} style={styles.avatarButton}>
            <Text style={styles.avatarButtonText}>{inicial}</Text>
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
                O Superintendente ainda não lançou as próximas aulas para a sua classe.
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

          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Sair / Voltar ao Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ============ TELA DE PERFIL (MODAL) ============ */}
      <Modal
        visible={perfilVisivel}
        animationType="slide"
        onRequestClose={fecharPerfil}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.perfilContainer, { backgroundColor: corFundo }]}>
          <View style={[styles.perfilTopBar, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
            <TouchableOpacity onPress={fecharPerfil} style={styles.perfilBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.perfilTopTitle}>Meu perfil</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.perfilContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.perfilCard,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
                  borderColor: isDarkMode ? '#334155' : '#1E293B',
                },
              ]}
            >
              <View style={styles.perfilCardTopo}>
                <View style={styles.perfilAvatar}>
                  <Text style={styles.perfilAvatarTexto}>{inicial}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.perfilNome} numberOfLines={2}>
                    {nomePerfil}
                  </Text>
                  <View style={styles.badgePerfilClasse}>
                    <Ionicons name="school-outline" size={14} color="#93C5FD" />
                    <Text style={styles.badgePerfilClasseTexto}>{classePerfil}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSub }]}>CONTATO</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <View style={styles.linhaInfo}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="mail-outline" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: corSub }]}>E-mail</Text>
                  <Text style={[styles.infoValor, { color: corTexto }]} numberOfLines={1}>
                    {perfilUsuario.email || '—'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSub }]}>CONTA</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <TouchableOpacity style={styles.linhaInfo} onPress={alterarSenha}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="key-outline" size={22} color="#2563EB" />
                </View>
                <Text style={[styles.infoValor, { color: corTexto, flex: 1 }]}>Alterar senha</Text>
                <Ionicons
                  name={senhaVisivel ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color={corSub}
                />
              </TouchableOpacity>

              {senhaVisivel && (
                <View style={styles.formSenha}>
                  <TextInput
                    value={novaSenha}
                    onChangeText={setNovaSenha}
                    placeholder="Nova senha"
                    placeholderTextColor={corSub}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[styles.inputSenha, { color: corTexto, borderColor: corBorda }]}
                  />
                  <TextInput
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={corSub}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[styles.inputSenha, { color: corTexto, borderColor: corBorda }]}
                  />
                  <TouchableOpacity
                    style={styles.btnSalvarSenha}
                    onPress={salvarNovaSenha}
                    disabled={salvandoSenha}
                  >
                    {salvandoSenha ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.btnSalvarSenhaTexto}>Salvar nova senha</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.divisor, { backgroundColor: corBorda }]} />

              <TouchableOpacity style={styles.linhaInfo} onPress={sair}>
                <View style={[styles.iconeBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.infoValor, { color: '#EF4444', flex: 1 }]}>Sair</Text>
                <Ionicons name="chevron-forward" size={20} color={corSub} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  headerTheme: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
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
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  avatarButtonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20 },
  h1: { fontSize: 26, fontWeight: 'bold', marginBottom: 12, width: '100%' },
  h2: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8, width: '100%' },

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

  perfilContainer: { flex: 1 },
  perfilTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  perfilBackBtn: { width: 40, height: 40, justifyContent: 'center' },
  perfilTopTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  perfilContent: { padding: 20, paddingBottom: 60 },

  perfilCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  perfilCardTopo: { flexDirection: 'row', alignItems: 'center' },
  perfilAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilAvatarTexto: { color: '#FFF', fontSize: 38, fontWeight: 'bold' },
  perfilNome: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  badgePerfilClasse: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  badgePerfilClasseTexto: { color: '#93C5FD', fontWeight: 'bold', fontSize: 13 },

  perfilSecao: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 4,
  },
  perfilBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linhaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12 },
  infoValor: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  divisor: { height: 1 },

  formSenha: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  inputSenha: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  btnSalvarSenha: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSalvarSenhaTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});