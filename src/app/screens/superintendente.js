import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
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

  // Abre/fecha o formulário de troca de senha (sem e-mail)
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
          router.replace('/'); // Ajuste para a sua rota de login
        },
      },
    ]);
  };

  // Cores do perfil (seguindo o tema do app)
  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#334155' : '#E2E8F0');
  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const corSub = theme.subtext || (isDarkMode ? '#94A3B8' : '#64748B');
  const corIconeBox = isDarkMode ? '#334155' : '#E2E8F0';

  const cardModulo = [
    styles.gridCard,
    {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.card,
      borderColor: theme.border,
      borderWidth: isDarkMode ? 0 : 1,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <View>
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
              size={20}
              color={isDarkMode ? '#F59E0B' : '#6366F1'}
            />
          </TouchableOpacity>

          {/* Avatar de Perfil */}
          <TouchableOpacity onPress={abrirPerfil} style={styles.avatarButton}>
            <Text style={styles.avatarButtonText}>{inicial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner de Lançamento do Domingo */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
              borderColor: theme.border,
              borderWidth: isDarkMode ? 0 : 1,
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
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/chamada')}>
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Iniciar Chamada</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Painel da EBD</Text>

        {/* Grelha de Módulos EBD */}
        <View style={styles.gridContainer}>
          <TouchableOpacity style={cardModulo} onPress={() => router.push('/escala-professores')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="calendar-outline" size={24} color="#4F46E5" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Escala Trimestral</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Gerar rodízio automático</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/cadastrar-licao')}>
            <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="book-outline" size={24} color="#7C3AED" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Cadastrar Lição</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Agenda e professores</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/assiduidade')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trophy-outline" size={24} color="#D97706" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Assiduidade</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Ranking sem faltas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/classes')}>
            <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="school-outline" size={24} color="#2563EB" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Classes</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Gestão de turmas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/ausentes')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Ausentes</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Controle de visitas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardModulo} onPress={() => router.push('/relatorios')}>
            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="document-text-outline" size={24} color="#16A34A" />
            </View>
            <Text style={[styles.gridTitle, { color: theme.text }]}>Relatórios</Text>
            <Text style={[styles.gridSub, { color: theme.subtext }]}>Emissão de dados</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ============ TELA DE PERFIL (MODAL) ============ */}
      <Modal
        visible={perfilVisivel}
        animationType="slide"
        onRequestClose={fecharPerfil}
        statusBarTranslucent
      >
        <SafeAreaView style={[styles.perfilContainer, { backgroundColor: corFundo }]}>
          {/* Barra superior */}
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
            {/* Cartão principal: avatar, nome e classe */}
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
                  <View style={styles.badgeClasse}>
                    <Ionicons name="school-outline" size={14} color="#93C5FD" />
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
                  <Ionicons name="mail-outline" size={22} color="#2563EB" />
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
                  <Ionicons name="shield-outline" size={22} color="#2563EB" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeButton: {
    padding: 8,
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
  },
  avatarButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mainCardBadge: {
    backgroundColor: '#16A34A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  mainCardBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  mainCardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mainCardSub: { color: '#94A3B8', fontSize: 13, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: { fontSize: 14, fontWeight: 'bold' },
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
  badgeClasse: {
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
  badgeClasseTexto: { color: '#93C5FD', fontWeight: 'bold', fontSize: 13 },

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

  // ---------- Formulário de troca de senha ----------
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