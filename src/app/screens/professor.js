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

export default function InicioScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  const [nomeUsuario, setNomeUsuario] = useState('Professor');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [perfilVisivel, setPerfilVisivel] = useState(false);

  // Troca de senha dentro do app
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    carregarPerfil();
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

        {/* Conteúdo posicionado no topo */}
        <View style={styles.content}>
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
        </View>
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