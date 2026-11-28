import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../supabase';

// Deixa o valor do banco com a primeira letra maiúscula (ex.: "superintendente" -> "Superintendente")
const formatarTipo = (tipo) => {
  if (!tipo) return '—';
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
};

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [perfilVisivel, setPerfilVisivel] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [perfil, setPerfil] = useState({
    nome: '',
    classe: '',
    tipo: '',
    email: '',
  });

  // Troca de senha dentro do app
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const nomeUsuario = perfil.nome || params.userName || 'Superintendente';
  const classeUsuario =
    perfil.classe || (perfil.tipo ? formatarTipo(perfil.tipo) : 'Superintendente');
  const inicial = String(nomeUsuario).trim().charAt(0).toUpperCase() || 'S';

  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Busca nome, tipo de usuário, classe e e-mail na tabela "users"
  const carregarPerfil = useCallback(async () => {
    try {
      setLoadingPerfil(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data: registro, error } = await supabase
        .from('users')
        .select('nome, email, tipo_usuario, classe')
        .eq('id', user.id)
        .maybeSingle();

      if (error) console.log('Erro ao buscar users:', error.message);

      setPerfil({
        nome: registro?.nome || '',
        classe: registro?.classe || '',
        tipo: registro?.tipo_usuario || '',
        email: registro?.email || user.email || '',
      });
    } catch (error) {
      console.log('Erro ao carregar perfil:', error.message);
    } finally {
      setLoadingPerfil(false);
    }
  }, []);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const abrirPerfil = () => {
    setPerfilVisivel(true);
    carregarPerfil();
  };

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

  const sair = async () => {
    try {
      fecharPerfil();
      await supabase.auth.signOut();
    } catch (err) {
      console.log('Erro ao sair:', err);
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
      return;
    }

    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => router.replace('/'),
      },
    ]);
  };

  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#334155' : '#E2E8F0');
  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const corSub = theme.subtext || (isDarkMode ? '#94A3B8' : '#64748B');
  const corIconeBox = isDarkMode ? '#334155' : '#F1F5F9';

  const cardModulo = [
    styles.gridCard,
    {
      backgroundColor: corCard,
      borderColor: corBorda,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: corFundo }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* Header Modernizado */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerSubtitle}>
            {getSaudacao()}, {nomeUsuario}!
          </Text>
          <Text style={styles.headerTitle}>Gestão EBD</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeButton,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={18}
              color={isDarkMode ? '#F59E0B' : '#FFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={abrirPerfil} style={styles.avatarButton} activeOpacity={0.8}>
            <Text style={styles.avatarButtonText}>{inicial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Lançamento do Domingo */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
              borderColor: corBorda,
            },
          ]}
        >
          <View style={styles.mainCardBadge}>
            <Text style={styles.mainCardBadgeText}>HOJE</Text>
          </View>
          <Text style={styles.mainCardTitle}>Lançamento do Domingo</Text>
          <Text style={styles.mainCardSub}>
            Registre a frequência e o controle de presença dos alunos da classe.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/chamada')} activeOpacity={0.85}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Iniciar Chamada</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: corTexto }]}>Painel da EBD</Text>

        {/* Grelha de Módulos EBD */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={cardModulo} onPress={() => router.push('/escala-professores')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.2)' : '#E0E7FF' }]}>
              <Ionicons name="calendar-outline" size={22} color={isDarkMode ? '#818CF8' : '#4F46E5'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Escala Trimestral</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Gerar rodízio automático</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/cadastrar-licao')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.2)' : '#F3E8FF' }]}>
              <Ionicons name="book-outline" size={22} color={isDarkMode ? '#A78BFA' : '#7C3AED'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Cadastrar Lição</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Agenda e professores</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/assiduidade')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7' }]}>
              <Ionicons name="trophy-outline" size={22} color={isDarkMode ? '#FBBF24' : '#D97706'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Assiduidade</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Ranking sem faltas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/classes')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE' }]}>
              <Ionicons name="school-outline" size={22} color={isDarkMode ? '#60A5FA' : '#2563EB'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Classes</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Gestão de turmas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/ausentes')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={22} color={isDarkMode ? '#F87171' : '#DC2626'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Ausentes</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Controle de visitas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/relatorios')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }]}>
              <Ionicons name="document-text-outline" size={22} color={isDarkMode ? '#4ADE80' : '#16A34A'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Relatórios</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Emissão de dados</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/financeiro')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE' }]}>
              <Ionicons name="cash-outline" size={22} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Financeiro</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Controle de caixa</Text>
          </TouchableOpacity>

          {/* NOVO: Leitura Semanal */}
          <TouchableOpacity style={cardModulo} onPress={() => router.push('/leitura-semanal')} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1' }]}>
              <Ionicons name="reader-outline" size={22} color={isDarkMode ? '#2DD4BF' : '#0D9488'} />
            </View>
            <Text style={[styles.gridTitle, { color: corTexto }]}>Leitura Semanal</Text>
            <Text style={[styles.gridSub, { color: corSub }]}>Versículos da semana</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ============ TELA DE PERFIL (OVERLAY) ============ */}
      {perfilVisivel && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.perfilContainer,
            { backgroundColor: corFundo, zIndex: 999 },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
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
              showsVerticalScrollIndicator={false}
            >
              {/* Cartão principal: avatar, nome e classe */}
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
                    <View style={styles.badgeClasse}>
                      <Ionicons name="school-outline" size={14} color="#2563EB" />
                      <Text style={styles.badgeClasseTexto}>{classeUsuario}</Text>
                    </View>
                  </View>
                </View>

                {loadingPerfil && (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 14 }} />
                )}
              </View>

              {/* CONTATO */}
              <Text style={[styles.perfilSecao, { color: corSub }]}>CONTATO</Text>
              <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
                <View style={styles.linhaInfo}>
                  <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                    <Ionicons name="mail-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: corSub }]}>E-mail</Text>
                    <Text style={[styles.infoValor, { color: corTexto }]} numberOfLines={1}>
                      {perfil.email || '—'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divisor, { backgroundColor: corBorda }]} />

                <View style={styles.linhaInfo}>
                  <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                    <Ionicons name="shield-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: corSub }]}>Função</Text>
                    <Text style={[styles.infoValor, { color: corTexto }]}>
                      {formatarTipo(perfil.tipo)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* CONTA */}
              <Text style={[styles.perfilSecao, { color: corSub }]}>SEGURANÇA E CONTA</Text>
              <View style={[styles.perfilBox, { backgroundColor: corCard, borderColor: corBorda }]}>
                <TouchableOpacity style={styles.linhaInfo} onPress={alterarSenha} activeOpacity={0.7}>
                  <View style={[styles.iconeBox, { backgroundColor: corIconeBox }]}>
                    <Ionicons name="key-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={[styles.infoValor, { color: corTexto, flex: 1 }]}>Alterar senha</Text>
                  <Ionicons
                    name={senhaVisivel ? 'chevron-down' : 'chevron-forward'}
                    size={18}
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
                      style={[styles.inputSenha, { color: corTexto, borderColor: corBorda, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}
                    />
                    <TextInput
                      value={confirmarSenha}
                      onChangeText={setConfirmarSenha}
                      placeholder="Confirmar nova senha"
                      placeholderTextColor={corSub}
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

                <Pressable
                  onPress={sair}
                  style={({ pressed }) => [styles.linhaInfo, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.iconeBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.infoValor, { color: '#EF4444', flex: 1 }]}>Sair da conta</Text>
                  <Ionicons name="chevron-forward" size={18} color={corSub} />
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerSubtitle: { color: '#94A3B8', fontSize: 12, fontWeight: '600', letterSpacing: -0.2 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  mainCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mainCardBadge: {
    backgroundColor: '#16A34A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  mainCardBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  mainCardTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  mainCardSub: { color: '#94A3B8', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  gridSub: { fontSize: 11, marginTop: 2 },

  // ---------- Estilos do Perfil ----------
  perfilContainer: { flex: 1 },
  perfilTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  perfilBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  perfilTopTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  perfilContent: { padding: 20, gap: 16, paddingBottom: 40 },

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
  perfilCardTopo: { flexDirection: 'row', alignItems: 'center' },
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
  perfilAvatarTexto: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  perfilNome: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  badgeClasse: {
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
  badgeClasseTexto: { color: '#2563EB', fontWeight: '600', fontSize: 12 },

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
  infoLabel: { fontSize: 11, fontWeight: '500' },
  infoValor: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  divisor: { height: 1 },

  // ---------- Formulário de troca de senha ----------
  formSenha: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
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
  btnSalvarSenhaTexto: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});