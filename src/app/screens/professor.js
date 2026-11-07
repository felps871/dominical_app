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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../supabase';

// Quantas chamadas recentes aparecem na lista
const MAX_CHAMADAS = 10;

// Converte a string "YYYY-MM-DD" do banco para "DD/MM/AAAA"
const formatarDataBR = (dataString) => {
  if (!dataString) return '';
  const apenasData = String(dataString).split('T')[0];
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
  const [perfilVisivel, setPerfilVisivel] = useState(false);

  // Frequências (tabela "presenca")
  const [chamadas, setChamadas] = useState([]);
  const [mostrarDetalhesFreq, setMostrarDetalhesFreq] = useState(false);
  const [erroFreq, setErroFreq] = useState('');
  const [chamadaAberta, setChamadaAberta] = useState(null);
  const [frequencia, setFrequencia] = useState({
    mes: 0,
    ano: 0,
    presentesMes: 0,
    totaisMes: 0,
    presentesAno: 0,
    totaisAno: 0,
  });
  const [carregandoFreq, setCarregandoFreq] = useState(true);

  // Troca de senha dentro do app
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    carregarPerfil();
    carregarFrequencias();
  }, []);

  const carregarPerfil = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmailUsuario(user.email || '');

      const { data: perfil } = await supabase
        .from('users')
        .select('nome')
        .eq('id', user.id)
        .maybeSingle();

      setNomeUsuario(perfil?.nome || user.user_metadata?.nome || 'Professor');
    } catch (error) {
      console.log('Erro ao carregar perfil:', error.message);
    }
  };

  // Busca os registros da tabela "presenca" e agrupa por chamada (data + classe + horário)
  const carregarFrequencias = async () => {
    try {
      setCarregandoFreq(true);
      setErroFreq('');

      const { data, error } = await supabase
        .from('presenca')
        .select('*, alunos(nome)')
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.log('Erro ao buscar presenças:', error.message);
        setErroFreq(error.message);
        setChamadas([]);
        return;
      }

      const registros = data || [];

      // ---- Agrupa por chamada ----
      const mapa = {};
      registros.forEach((item) => {
        const chave = `${item.data}|${item.classe}|${item.horario}`;
        if (!mapa[chave]) {
          mapa[chave] = {
            chave,
            data: item.data,
            classe: item.classe,
            horario: item.horario,
            total: 0,
            presentes: 0,
            biblias: 0,
            revistas: 0,
            alunos: [],
          };
        }
        const grupo = mapa[chave];
        grupo.total += 1;
        grupo.alunos.push({
          nome: item.alunos?.nome || `Aluno #${item.aluno_id}`,
          presente: item.presente === true,
          justificativa: item.justificativa || '',
        });
        if (item.presente === true) grupo.presentes += 1;
        grupo.biblias += item.qtd_biblias || 0;
        grupo.revistas += item.qtd_revistas || 0;
      });

      // A ordem de inserção já segue data decrescente
      setChamadas(Object.values(mapa));

      // Resumo mensal e anual (contagens direto no banco, sem limite de 1000 linhas)
      await carregarResumo();
    } catch (err) {
      console.log('Erro crítico ao processar frequências:', err?.message || err);
      setErroFreq(String(err?.message || err));
      setChamadas([]);
    } finally {
      setCarregandoFreq(false);
    }
  };

  // Conta presenças do mês e do ano atuais, somando todos os alunos
  const carregarResumo = async () => {
    const contar = async (inicio, fim, somentePresentes) => {
      let query = supabase
        .from('presenca')
        .select('id', { count: 'exact', head: true })
        .gte('data', inicio)
        .lte('data', fim);
      if (somentePresentes) query = query.eq('presente', true);

      const { count, error } = await query;
      if (error) {
        console.log('Erro ao contar presenças:', error.message);
        return 0;
      }
      return count || 0;
    };

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ultimoDia = String(new Date(ano, agora.getMonth() + 1, 0).getDate()).padStart(2, '0');

    const inicioMes = `${ano}-${mes}-01`;
    const fimMes = `${ano}-${mes}-${ultimoDia}`;
    const inicioAno = `${ano}-01-01`;
    const fimAno = `${ano}-12-31`;

    const [totaisMes, presentesMes, totaisAno, presentesAno] = await Promise.all([
      contar(inicioMes, fimMes, false),
      contar(inicioMes, fimMes, true),
      contar(inicioAno, fimAno, false),
      contar(inicioAno, fimAno, true),
    ]);

    setFrequencia({
      mes: totaisMes > 0 ? Math.round((presentesMes / totaisMes) * 100) : 0,
      ano: totaisAno > 0 ? Math.round((presentesAno / totaisAno) * 100) : 0,
      presentesMes,
      totaisMes,
      presentesAno,
      totaisAno,
    });
  };

  const entrarNaChamada = () => {
    router.push('/chamada');
  };

  // Funções do Modal de Perfil
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

  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#172033');
  const corSubtexto = theme.subtext || (isDarkMode ? '#CBD5E1' : '#64748B');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#475569' : '#CBD5E1');
  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corIconeBox = isDarkMode ? '#334155' : '#E2E8F0';

  const primeiroNome = String(nomeUsuario).trim().split(' ')[0] || 'Professor';
  const inicial = primeiroNome.charAt(0).toUpperCase();

  const gradientColors = isDarkMode
    ? ['#0F172A', '#172554']
    : ['#F8FAFC', '#DBEAFE'];

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
        {/* Barra superior contendo apenas o alternar tema e o avatar clicável */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />

          <View style={styles.topActions}>
            <TouchableOpacity
              accessibilityLabel="Alterar tema"
              onPress={toggleTheme}
              style={[styles.iconButton, { backgroundColor: corCard, borderColor: corBorda }]}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={21}
                color={isDarkMode ? '#FBBF24' : '#2563EB'}
              />
            </TouchableOpacity>

            {/* Avatar Clicável (Abre o Modal de Perfil) */}
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

        {/* Conteúdo rolável: boas-vindas, botão e frequências */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Bloco Superior Unificado com "Olá, $nome" */}
          <View style={[styles.welcomeCard, { backgroundColor: corCard, borderColor: corBorda }]}>
            <Text style={[styles.helloText, { color: corSubtexto }]}>
              Olá, <Text style={[styles.nameText, { color: corTexto }]}>{primeiroNome}</Text>
            </Text>

            <View style={styles.roleLine}>
              <Ionicons name="school-outline" size={20} color="#2563EB" />
              <Text style={[styles.roleText, { color: corSubtexto }]}>Professor</Text>
            </View>
          </View>

          {/* Botão Central de Registrar Frequência */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={entrarNaChamada}
            style={styles.primaryButton}
          >
            <Ionicons name="checkmark-circle-outline" size={23} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Registrar frequência</Text>
          </TouchableOpacity>

          {/* ================= FREQUÊNCIAS (tabela presenca) ================= */}
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <Text style={[styles.h2, { color: corTexto }]}>Frequências</Text>
              <TouchableOpacity
                onPress={carregarFrequencias}
                disabled={carregandoFreq}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Atualizar frequências"
              >
                <Ionicons name="refresh" size={22} color={isDarkMode ? '#38bdf8' : '#2563eb'} />
              </TouchableOpacity>
            </View>

            {carregandoFreq ? (
              <ActivityIndicator
                size="large"
                color={isDarkMode ? '#38bdf8' : '#2563eb'}
                style={{ marginVertical: 20 }}
              />
            ) : erroFreq ? (
              <View style={[styles.cardInfo, { backgroundColor: corCard, borderColor: '#EF4444' }]}>
                <Text style={[styles.cardTitulo, { color: '#EF4444' }]}>
                  Não foi possível carregar
                </Text>
                <Text style={[styles.cardSub, { color: corSubtexto }]}>{erroFreq}</Text>
              </View>
            ) : chamadas.length === 0 ? (
              <View style={[styles.cardInfo, { backgroundColor: corCard, borderColor: corBorda }]}>
                <Text style={[styles.cardTitulo, { color: corTexto }]}>
                  Nenhuma frequência registrada
                </Text>
                <Text style={[styles.cardSub, { color: corSubtexto }]}>
                  Toque em "Registrar frequência" para fazer a primeira chamada.
                </Text>
              </View>
            ) : (
              <>
                {/* Mini card de frequência (mês e ano) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setMostrarDetalhesFreq(!mostrarDetalhesFreq)}
                  style={[
                    styles.miniCardFreq,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : corCard,
                      borderColor: corBorda,
                    },
                  ]}
                >
                  <View style={styles.miniCardRow}>
                    <View style={styles.miniCardInfoLeft}>
                      <Ionicons
                        name="stats-chart"
                        size={18}
                        color={isDarkMode ? '#38bdf8' : '#2563eb'}
                      />
                      <Text style={[styles.miniCardTitle, { color: corTexto }]}>
                        Frequência: <Text style={{ fontWeight: 'bold' }}>{frequencia.mes}% Mês</Text>
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                        <Text style={[styles.freqLabel, { color: corTexto }]}>Presença Mensal</Text>
                        <View style={styles.progressRow}>
                          <View style={styles.progressBarBackground}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${frequencia.mes}%`, backgroundColor: badgeMes.color },
                              ]}
                            />
                          </View>
                          <Text style={[styles.progressPercentText, { color: corTexto }]}>
                            {frequencia.mes}%
                          </Text>
                        </View>
                        <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                          {frequencia.presentesMes} presenças em {frequencia.totaisMes} registros no mês
                        </Text>
                      </View>

                      {/* Presença Anual */}
                      <View style={[styles.freqMetricContainer, { marginTop: 10 }]}>
                        <View style={styles.freqHeaderRow}>
                          <Text style={[styles.freqLabel, { color: corTexto }]}>Presença Anual</Text>
                          <View style={[styles.badgeContainer, { backgroundColor: badgeAno.bg }]}>
                            <Ionicons name={badgeAno.icon} size={12} color={badgeAno.color} />
                            <Text style={[styles.badgeText, { color: badgeAno.color }]}>
                              {badgeAno.text}
                            </Text>
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
                          <Text style={[styles.progressPercentText, { color: corTexto }]}>
                            {frequencia.ano}%
                          </Text>
                        </View>
                        <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                          {frequencia.presentesAno} presenças em {frequencia.totaisAno} registros no ano
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Últimas chamadas */}
                <Text style={[styles.subtitulo, { color: corSubtexto }]}>ÚLTIMAS CHAMADAS</Text>

                {chamadas.slice(0, MAX_CHAMADAS).map((item) => {
                  const pct = item.total > 0 ? Math.round((item.presentes / item.total) * 100) : 0;
                  const badge = getBadgeAssiduidade(pct);
                  const faltas = item.total - item.presentes;
                  const aberta = chamadaAberta === item.chave;

                  return (
                    <TouchableOpacity
                      key={item.chave}
                      activeOpacity={0.85}
                      onPress={() => setChamadaAberta(aberta ? null : item.chave)}
                      style={[styles.cardInfo, { backgroundColor: corCard, borderColor: corBorda }]}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.badgeClasse}>{item.classe}</Text>
                        <Text
                          style={[styles.cardData, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}
                        >
                          📅 {formatarDataBR(item.data)} · {item.horario}
                        </Text>
                      </View>

                      <View style={styles.progressRow}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${pct}%`, backgroundColor: badge.color },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressPercentText, { color: corTexto }]}>
                          {pct}%
                        </Text>
                      </View>

                      <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                        ✅ {item.presentes} presentes · ❌ {faltas}{' '}
                        {faltas === 1 ? 'falta' : 'faltas'} · {item.total} alunos
                      </Text>
                      <Text style={[styles.freqSubtext, { color: corSubtexto }]}>
                        📖 {item.biblias} Bíblias · 📰 {item.revistas} Revistas
                      </Text>

                      {aberta && (
                        <View style={styles.listaAlunos}>
                          <View style={[styles.divider, { backgroundColor: corBorda }]} />
                          {[...item.alunos]
                            .sort((x, y) => x.nome.localeCompare(y.nome))
                            .map((aluno, idx) => (
                              <View key={`${item.chave}-${idx}`} style={styles.alunoLinha}>
                                <Ionicons
                                  name={aluno.presente ? 'checkmark-circle' : 'close-circle'}
                                  size={18}
                                  color={aluno.presente ? '#10B981' : '#EF4444'}
                                />
                                <Text
                                  style={[styles.alunoNome, { color: corTexto }]}
                                  numberOfLines={1}
                                >
                                  {aluno.nome}
                                </Text>
                                {!aluno.presente && !!aluno.justificativa && (
                                  <Text style={[styles.alunoJust, { color: corSubtexto }]} numberOfLines={1}>
                                    {aluno.justificativa}
                                  </Text>
                                )}
                              </View>
                            ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
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
                    {nomeUsuario}
                  </Text>
                  <View style={styles.badgePerfilClasse}>
                    <Ionicons name="school-outline" size={14} color="#93C5FD" />
                    <Text style={styles.badgePerfilClasseTexto}>Professor</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSubtexto }]}>CONTATO</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <View style={styles.linhaInfo}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="mail-outline" size={22} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: corSubtexto }]}>E-mail</Text>
                  <Text style={[styles.infoValor, { color: corTexto }]} numberOfLines={1}>
                    {emailUsuario || '—'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[styles.perfilSecao, { color: corSubtexto }]}>CONTA</Text>
            <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
              <TouchableOpacity style={styles.linhaInfo} onPress={alterarSenha}>
                <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                  <Ionicons name="key-outline" size={22} color="#2563EB" />
                </View>
                <Text style={[styles.infoValor, { color: corTexto, flex: 1 }]}>Alterar senha</Text>
                <Ionicons
                  name={senhaVisivel ? 'chevron-down' : 'chevron-forward'}
                  size={20}
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
                    style={[styles.inputSenha, { color: corTexto, borderColor: corBorda }]}
                  />
                  <TextInput
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={corSubtexto}
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
                <Ionicons name="chevron-forward" size={20} color={corSubtexto} />
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
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  avatarButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 15, // Puxa o conteúdo mais para cima
    paddingBottom: 40,
    gap: 20,
  },
  welcomeCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  helloText: {
    fontSize: 26,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
  },
  roleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  roleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  // Seção de frequências
  secao: {
    width: '100%',
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 2,
    marginLeft: 4,
  },
  resumoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  freqLabel: {
    fontSize: 14,
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
    fontSize: 12,
    marginTop: 4,
  },
  miniCardFreq: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    marginVertical: 8,
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
  freqMetricContainer: {
    marginVertical: 2,
  },
  freqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.5,
  },

  listaAlunos: {
    marginTop: 4,
  },
  alunoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  alunoNome: {
    flex: 1,
    fontSize: 14,
  },
  alunoJust: {
    fontSize: 11,
    maxWidth: 110,
  },

  // Estilos da Modal de Perfil
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