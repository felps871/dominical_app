import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
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

const getBadgeAssiduidade = (percentual) => {
  if (percentual >= 90) {
    return { text: 'Excelente', icon: 'ribbon', color: '#10B981', bg: '#D1FAE5' };
  } else if (percentual >= 75) {
    return { text: 'Regular', icon: 'checkmark-circle', color: '#F59E0B', bg: '#FEF3C7' };
  }
  return { text: 'Atenção', icon: 'warning', color: '#EF4444', bg: '#FEE2E2' };
};

export default function InicioScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [nomeUsuario, setNomeUsuario] = useState('Professor');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [classeProfessor, setClasseProfessor] = useState('');
  const [perfilVisivel, setPerfilVisivel] = useState(false);

  // Frequência
  const [mostrarDetalhesFreq, setMostrarDetalhesFreq] = useState(false);
  const [erroFreq, setErroFreq] = useState('');
  const [frequencia, setFrequencia] = useState({
    mes: 0,
    ano: 0,
    aulasPresentesMes: 0,
    aulasTotaisMes: 0,
    aulasPresentesAno: 0,
    aulasTotaisAno: 0,
  });
  const [carregandoFreq, setCarregandoFreq] = useState(true);

  // Lição
  const [licaoProxima, setLicaoProxima] = useState(null);
  const [loadingLicao, setLoadingLicao] = useState(true);

  // Troca de senha
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setCarregandoFreq(true);
      setLoadingLicao(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmailUsuario(user.email || '');

      const { data: perfil } = await supabase
        .from('users')
        .select('nome, classe')
        .eq('id', user.id)
        .maybeSingle();

      const nomeAtual = perfil?.nome || user.user_metadata?.nome || 'Professor';
      const classeAtual = perfil?.classe || '';
      
      setNomeUsuario(nomeAtual);
      setClasseProfessor(classeAtual);

      await Promise.all([
        carregarFrequenciaIndividual(user.id, nomeAtual),
        fetchProximaLicao(classeAtual)
      ]);

    } catch (error) {
      console.log('Erro ao carregar dados:', error.message);
      setErroFreq(error.message);
    } finally {
      setCarregandoFreq(false);
      setLoadingLicao(false);
    }
  };

  const carregarFrequenciaIndividual = async (userId, nomeProf) => {
    try {
      const { data: alunoPorId } = await supabase
        .from('alunos')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let alunoIdAlvo = alunoPorId?.id;

      if (!alunoIdAlvo) {
        const primeiroNome = nomeProf.trim().split(' ')[0];
        const { data: alunosData } = await supabase
          .from('alunos')
          .select('id')
          .ilike('nome', `%${primeiroNome}%`)
          .limit(1);

        if (alunosData && alunosData.length > 0) {
          alunoIdAlvo = alunosData[0].id;
        }
      }

      let query = supabase.from('presenca').select('*');
      if (alunoIdAlvo) {
        query = query.eq('aluno_id', alunoIdAlvo);
      }

      const { data: presencas, error } = await query;
      if (error || !presencas || presencas.length === 0) return;

      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();

      const presencasMes = presencas.filter((item) => {
        if (!item.data) return false;
        const partes = item.data.split('T')[0].split('-');
        if (partes.length < 2) return false;
        const [anoStr, mesStr] = partes;
        return parseInt(mesStr, 10) === mesAtual && parseInt(anoStr, 10) === anoAtual;
      });

      const presencasAno = presencas.filter((item) => {
        if (!item.data) return false;
        const partes = item.data.split('T')[0].split('-');
        if (partes.length < 1) return false;
        const [anoStr] = partes;
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
      console.error('Erro ao processar frequência:', err);
    }
  };

  const fetchProximaLicao = async (classeAluno) => {
    try {
      const hojeStr = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('licoes')
        .select('*')
        .gte('data', hojeStr)
        .order('data', { ascending: true })
        .limit(1);

      if (classeAluno) {
        query = query.eq('classe', classeAluno);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar próxima lição:', error.message);
      } else if (data && data.length > 0) {
        setLicaoProxima(data[0]);
      } else {
        let fallbackQuery = supabase
          .from('licoes')
          .select('*')
          .order('id', { ascending: false })
          .limit(1);

        if (classeAluno) {
          fallbackQuery = fallbackQuery.eq('classe', classeAluno);
        }

        const { data: fallbackData } = await fallbackQuery;
        if (fallbackData && fallbackData.length > 0) {
          setLicaoProxima(fallbackData[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar lição:', err);
    }
  };

  const abrirRevistaDigital = (urlPersonalizada) => {
    const linkPadrao = 'https://exemplo.com/sua-revista-digital';
    const urlAlvo = urlPersonalizada || linkPadrao;

    Linking.canOpenURL(urlAlvo).then((supported) => {
      if (supported) {
        Linking.openURL(urlAlvo);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link da revista.');
      }
    }).catch((err) => console.error('Erro ao abrir link:', err));
  };

  const entrarNaChamada = () => {
    router.push('/chamada');
  };

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

  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const corSubtexto = theme.subtext || (isDarkMode ? '#94A3B8' : '#64748B');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#334155' : '#E2E8F0');
  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corIconeBox = isDarkMode ? '#334155' : '#F1F5F9';

  const primeiroNome = String(nomeUsuario).trim().split(' ')[0] || 'Professor';
  const inicial = primeiroNome.charAt(0).toUpperCase();

  const gradientColors = isDarkMode
    ? ['#0F172A', '#1E293B']
    : ['#F8FAFC', '#EFF6FF'];

  const badgeMes = getBadgeAssiduidade(frequencia.mes);
  const badgeAno = getBadgeAssiduidade(frequencia.ano);

  return (
    <LinearGradient colors={gradientColors} style={styles.background}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Barra superior limpa e alinhada */}
        <View style={styles.topBar}>
          <View style={styles.appBrandContainer}>
            <Text style={[styles.appBrandTitle, { color: corTexto }]}>EBD Professor</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              accessibilityLabel="Alterar tema"
              onPress={toggleTheme}
              style={[styles.iconButton, { backgroundColor: corCard, borderColor: corBorda }]}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={isDarkMode ? '#FBBF24' : '#2563EB'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Ir para o perfil"
              onPress={abrirPerfil}
              style={styles.avatarButton}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarButtonText}>{inicial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conteúdo rolável com espaçamento equilibrado */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Card de Boas-vindas Aprimorado */}
          <View style={[styles.welcomeCard, { backgroundColor: corCard, borderColor: corBorda }]}>
            <View style={styles.welcomeTextGroup}>
              <Text style={[styles.helloText, { color: corSubtexto }]}>Bem-vindo de volta,</Text>
              <Text style={[styles.nameText, { color: corTexto }]}>{primeiroNome}</Text>
            </View>

            <View style={[styles.roleBadgeContainer, { backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="school" size={16} color="#2563EB" />
              <Text style={styles.roleBadgeText}>
                {classeProfessor ? `Classe: ${classeProfessor}` : 'Professor'}
              </Text>
            </View>
          </View>

          {/* Botão de Ação Principal (CTA) */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={entrarNaChamada}
            style={styles.primaryButton}
          >
            <View style={styles.primaryButtonContent}>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Registrar Frequência</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* ================= RESUMO DE FREQUÊNCIAS ================= */}
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <Text style={[styles.h2, { color: corTexto }]}>Minha Frequência</Text>
              <TouchableOpacity
                onPress={() => carregarDadosIniciais()}
                disabled={carregandoFreq}
                style={[styles.refreshButton, { borderColor: corBorda, backgroundColor: corCard }]}
                accessibilityLabel="Atualizar frequências"
              >
                <Ionicons name="refresh-outline" size={18} color={isDarkMode ? '#38bdf8' : '#2563eb'} />
              </TouchableOpacity>
            </View>

            {carregandoFreq ? (
              <View style={[styles.loadingContainer, { backgroundColor: corCard, borderColor: corBorda }]}>
                <ActivityIndicator size="small" color={isDarkMode ? '#38bdf8' : '#2563eb'} />
                <Text style={[styles.loadingText, { color: corSubtexto }]}>Calculando frequência...</Text>
              </View>
            ) : erroFreq ? (
              <View style={[styles.cardInfo, { backgroundColor: corCard, borderColor: '#EF4444' }]}>
                <Text style={[styles.cardTitulo, { color: '#EF4444' }]}>Não foi possível carregar</Text>
                <Text style={[styles.cardSub, { color: corSubtexto }]}>{erroFreq}</Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setMostrarDetalhesFreq(!mostrarDetalhesFreq)}
                style={[
                  styles.miniCardFreq,
                  {
                    backgroundColor: corCard,
                    borderColor: corBorda,
                  },
                ]}
              >
                <View style={styles.miniCardRow}>
                  <View style={styles.miniCardInfoLeft}>
                    <View style={[styles.statIconBox, { backgroundColor: badgeMes.bg }]}>
                      <Ionicons name="stats-chart" size={18} color={badgeMes.color} />
                    </View>
                    <View>
                      <Text style={[styles.miniCardLabel, { color: corSubtexto }]}>Taxa do Mês</Text>
                      <Text style={[styles.miniCardTitle, { color: corTexto }]}>{frequencia.mes}% de presença</Text>
                    </View>
                  </View>

                  <View style={styles.miniCardRight}>
                    <View style={[styles.badgeContainer, { backgroundColor: badgeMes.bg }]}>
                      <Ionicons name={badgeMes.icon} size={12} color={badgeMes.color} />
                      <Text style={[styles.badgeText, { color: badgeMes.color }]}>
                        {badgeMes.text}
                      </Text>
                    </View>
                    <Ionicons
                      name={mostrarDetalhesFreq ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={corSubtexto}
                    />
                  </View>
                </View>

                {mostrarDetalhesFreq && (
                  <View style={styles.expandedFreqContainer}>
                    <View style={[styles.divider, { backgroundColor: corBorda }]} />

                    {/* Presença Mensal */}
                    <View style={styles.freqMetricContainer}>
                      <View style={styles.freqHeaderRow}>
                        <Text style={[styles.freqLabel, { color: corTexto }]}>Mensal</Text>
                        <Text style={[styles.freqValueText, { color: corTexto }]}>{frequencia.mes}%</Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${frequencia.mes}%`, backgroundColor: badgeMes.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                        {frequencia.aulasPresentesMes} de {frequencia.aulasTotaisMes} aulas registradas
                      </Text>
                    </View>

                    {/* Presença Anual */}
                    <View style={[styles.freqMetricContainer, { marginTop: 14 }]}>
                      <View style={styles.freqHeaderRow}>
                        <Text style={[styles.freqLabel, { color: corTexto }]}>Anual</Text>
                        <Text style={[styles.freqValueText, { color: corTexto }]}>{frequencia.ano}%</Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${frequencia.ano}%`, backgroundColor: badgeAno.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                        {frequencia.aulasPresentesAno} de {frequencia.aulasTotaisAno} aulas registradas
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ================= PRÓXIMA LIÇÃO ================= */}
          <View style={styles.secao}>
            <Text style={[styles.h2, { color: corTexto, marginBottom: 10 }]}>Próxima Lição</Text>

            {loadingLicao ? (
              <View style={[styles.loadingContainer, { backgroundColor: corCard, borderColor: corBorda }]}>
                <ActivityIndicator size="small" color={isDarkMode ? '#38bdf8' : '#2563eb'} />
                <Text style={[styles.loadingText, { color: corSubtexto }]}>Buscando próxima aula...</Text>
              </View>
            ) : !licaoProxima ? (
              <View style={[styles.cardInfo, { backgroundColor: corCard, borderColor: corBorda }]}>
                <Text style={[styles.cardTitulo, { color: corTexto }]}>Nenhuma Lição Encontrada</Text>
                <Text style={[styles.cardSub, { color: corSubtexto }]}>
                  Não há lições cadastradas para o próximo período na classe {classeProfessor || 'selecionada'}.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.cardInfo,
                  {
                    backgroundColor: corCard,
                    borderColor: corBorda,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.badgeClasse}>{licaoProxima.classe}</Text>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={13} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                    <Text style={[styles.cardData, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>
                      {formatarDataBR(licaoProxima.data)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitulo, { color: corTexto }]}>{licaoProxima.titulo}</Text>
                
                <View style={styles.teacherInfoRow}>
                  <Ionicons name="person-outline" size={14} color={corSubtexto} />
                  <Text style={[styles.cardSub, { color: corSubtexto }]}>
                    Professor: <Text style={{ fontWeight: '600', color: corTexto }}>{licaoProxima.professor || nomeUsuario}</Text>
                  </Text>
                </View>

                {licaoProxima.link_revista && (
                  <TouchableOpacity 
                    style={styles.linkButtonLicao} 
                    onPress={() => abrirRevistaDigital(licaoProxima.link_revista)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="book-outline" size={16} color="#2563eb" />
                    <Text style={styles.linkButtonLicaoText}>Acessar Revista Digital</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ============ MODAL DE PERFIL ============ */}
      <Modal
        visible={perfilVisivel}
        animationType="slide"
        onRequestClose={fecharPerfil}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.perfilContainer, { backgroundColor: corFundo }]}>
          <View style={[styles.perfilTopBar, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderBottomColor: corBorda, borderBottomWidth: 1 }]}>
            <TouchableOpacity onPress={fecharPerfil} style={styles.perfilBackBtn}>
              <Ionicons name="close" size={24} color={corTexto} />
            </TouchableOpacity>
            <Text style={[styles.perfilTopTitle, { color: corTexto }]}>Meu Perfil</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.perfilContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.perfilCard,
                {
                  backgroundColor: corCard,
                  borderColor: corBorda,
                },
              ]}
            >
              <View style={styles.perfilCardTopo}>
                <View style={styles.perfilAvatar}>
                  <Text style={styles.perfilAvatarTexto}>{inicial}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.perfilNome, { color: corTexto }]} numberOfLines={2}>
                    {nomeUsuario}
                  </Text>
                  <View style={styles.badgePerfilClasse}>
                    <Ionicons name="school-outline" size={14} color="#2563EB" />
                    <Text style={styles.badgePerfilClasseTexto}>{classeProfessor || 'Professor'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSubtexto }]}>CONTATO</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <View style={styles.linhaInfo}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="mail-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: corSubtexto }]}>E-mail</Text>
                  <Text style={[styles.infoValor, { color: corTexto }]} numberOfLines={1}>
                    {emailUsuario || '—'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSubtexto }]}>SEGURANÇA E CONTA</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <TouchableOpacity style={styles.linhaInfo} onPress={alterarSenha} activeOpacity={0.7}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="key-outline" size={20} color="#2563EB" />
                </View>
                <Text style={[styles.infoValor, { color: corTexto, flex: 1 }]}>Alterar senha</Text>
                <Ionicons
                  name={senhaVisivel ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={corSubtexto}
                />
              </TouchableOpacity>

              {senhaVisivel && (
                <View style={styles.formSenha}>
                  <TextInput
                    value={novaSenha}
                    onChangeText={setNovaSenha}
                    placeholder="Nova senha"
                    placeholderTextColor={corSubtexto}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[styles.inputSenha, { color: corTexto, borderColor: corBorda, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}
                  />
                  <TextInput
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={corSubtexto}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[styles.inputSenha, { color: corTexto, borderColor: corBorda, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}
                  />
                  <TouchableOpacity
                    style={styles.btnSalvarSenha}
                    onPress={salvarNovaSenha}
                    disabled={salvandoSenha}
                    activeOpacity={0.8}
                  >
                    {salvandoSenha ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.btnSalvarSenhaTexto}>Atualizar Senha</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.divisor, { backgroundColor: corBorda }]} />

              <TouchableOpacity style={styles.linhaInfo} onPress={sair} activeOpacity={0.7}>
                <View style={[styles.iconeBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.infoValor, { color: '#EF4444', flex: 1 }]}>Sair da conta</Text>
                <Ionicons name="chevron-forward" size={18} color={corSubtexto} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  appBrandContainer: {
    flex: 1,
  },
  appBrandTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 20,
  },
  welcomeCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  welcomeTextGroup: {
    flex: 1,
    gap: 2,
  },
  helloText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secao: {
    width: '100%',
    gap: 8,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h2: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardInfo: {
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardData: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  cardTitulo: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  teacherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardSub: { 
    fontSize: 13 
  },
  linkButtonLicao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  linkButtonLicaoText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniCardFreq: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  miniCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCardInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  miniCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  miniCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedFreqContainer: {
    marginTop: 12,
  },
  freqMetricContainer: {
    gap: 6,
  },
  freqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freqLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  freqValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  freqSubtext: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.6,
  },
  perfilContainer: { 
    flex: 1 
  },
  perfilTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  perfilBackBtn: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  perfilTopTitle: { 
    fontSize: 17, 
    fontWeight: '700' 
  },
  perfilContent: { 
    padding: 20, 
    gap: 16,
    paddingBottom: 40 
  },
  perfilCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  perfilCardTopo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  perfilAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  perfilAvatarTexto: { 
    color: '#FFF', 
    fontSize: 26, 
    fontWeight: 'bold' 
  },
  perfilNome: { 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badgePerfilClasse: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  badgePerfilClasseTexto: { 
    color: '#2563EB', 
    fontWeight: '600', 
    fontSize: 12 
  },
  perfilSecao: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: -4,
    marginLeft: 4,
  },
  perfilBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  linhaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { 
    fontSize: 11,
    fontWeight: '500'
  },
  infoValor: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginTop: 1 
  },
  formSenha: { 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    gap: 12 
  },
  inputSenha: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  btnSalvarSenha: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnSalvarSenhaTexto: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 14 
  },
});