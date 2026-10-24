import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

import { autenticarUsuario } from '../services/Authservice'; // Certifique-se de que a função existe no Authservice.js

const ROTA_CADASTRO = '/cadastro';

// Mapeamento exato de rotas com base no tipo de usuário armazenado no Supabase
const ROTA_POR_PERFIL = {
  aluno: '/screens/aluno',
  professor: '/screens/professor',
};

const SUFIXOS_PAISES =
  'ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo br bs bt bw by bz ' +
  'ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er es et eu fi fj fk fm fo fr ' +
  'ga gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ' +
  'ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt ' +
  'mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru ' +
  'rw sa sb sc sd se sg sh si sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ' +
  'ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw';

const SUFIXOS_GENERICOS =
  'com net org edu gov mil int info biz name pro mobi asia tel travel jobs museum coop aero cat ' +
  'app dev tech online site store shop blog cloud email xyz top club live news life world today digital ' +
  'agency solutions services company group network systems church ong ngo community foundation ' +
  'media design page link space website fun art one global';

const SUFIXOS_VALIDOS = new Set([...SUFIXOS_PAISES.split(' '), ...SUFIXOS_GENERICOS.split(' ')]);

const rotuloDeDominioValido = (rotulo) =>
  rotulo.length >= 1 &&
  rotulo.length <= 63 &&
  /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(rotulo);

const emailTemFormatoValido = (email) => {
  if (email.length > 254 || /\s/.test(email)) return false;

  const partes = email.split('@');
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;

  if (!local || local.length > 64) return false;
  if (!/^[A-Za-z0-9._%+-]+$/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  const rotulos = dominio.split('.');
  if (rotulos.length < 2 || !rotulos.every(rotuloDeDominioValido)) return false;

  return SUFIXOS_VALIDOS.has(rotulos[rotulos.length - 1].toLowerCase());
};

const validarEmail = (valor) => {
  const email = valor.trim();
  if (!email) return 'Informe o seu e-mail.';
  if (!emailTemFormatoValido(email)) return 'Digite um e-mail válido, como nome@exemplo.com';
  return '';
};

const validarSenha = (valor) => {
  if (!valor) return 'Informe a sua senha.';
  return '';
};

export default function Login() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { cadastro, email: emailParam } = useLocalSearchParams();

  const senhaRef = useRef(null);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [campoFocado, setCampoFocado] = useState(null);
  const [erros, setErros] = useState({ email: '', senha: '' });
  const [aviso, setAviso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (cadastro !== 'ok') return;
    if (typeof emailParam === 'string' && emailParam) setEmail(emailParam);
    setAviso({
      tipo: 'sucesso',
      texto: 'Conta criada com sucesso! Entre com o seu e-mail e a senha.',
    });
  }, [cadastro, emailParam]);

  const gradientColors = isDarkMode
    ? ['#0f172a', '#1e3a8a']
    : ['#f8fafc', '#e2e8f0'];

  const corErro = isDarkMode ? '#F87171' : '#DC2626';
  const corLink = isDarkMode ? '#60A5FA' : '#2563EB';
  const corPlaceholder = isDarkMode ? '#94A3B8' : '#64748B';
  const corSucesso = isDarkMode ? '#4ADE80' : '#15803D';
  const avisoCor = aviso?.tipo === 'sucesso' ? corSucesso : corErro;

  const alterarEmail = (valor) => {
    setEmail(valor);
    setAviso(null);
    if (erros.email) setErros((atual) => ({ ...atual, email: '' }));
  };

  const alterarSenha = (valor) => {
    setSenha(valor);
    setAviso(null);
    if (erros.senha) setErros((atual) => ({ ...atual, senha: '' }));
  };

  const sairDoCampo = (campo) => {
    setCampoFocado(null);
    if (campo === 'email' && email.length > 0) {
      setErros((atual) => ({ ...atual, email: validarEmail(email) }));
    }
  };

  const handleEntrar = async () => {
    if (carregando) return;
    Keyboard.dismiss();
    setAviso(null);

    const novosErros = {
      email: validarEmail(email),
      senha: validarSenha(senha),
    };
    setErros(novosErros);

    if (novosErros.email || novosErros.senha) return;

    setCarregando(true);
    try {
      // Autenticação integrada com o Supabase e consulta do tipo de usuário
      const resultado = await autenticarUsuario({ email: email.trim().toLowerCase(), senha });

      if (resultado.status !== 'sucesso') {
        setAviso({ tipo: 'erro', texto: resultado.mensagem });
        return;
      }

      const { usuario } = resultado;
      
      // Normaliza para minúsculas para garantir correspondência exata com o objeto de rotas
      const tipoNormalizado = usuario.tipoUsuario ? usuario.tipoUsuario.toLowerCase().trim() : '';
      const rota = ROTA_POR_PERFIL[tipoNormalizado];
      
      if (!rota) {
        setAviso({ tipo: 'erro', texto: `Perfil não reconhecido (${usuario.tipoUsuario || 'vazio'}).` });
        return;
      }

      // Redireciona para o painel correspondente (/aluno ou /professor)
      router.replace({ pathname: rota, params: { userName: usuario.nome } });
    } catch (e) {
      console.warn('Erro inesperado no login:', e?.message || e);
      setAviso({ tipo: 'erro', texto: 'Não foi possível entrar. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  };

  const estiloCampo = (campo) => [
    styles.campo,
    {
      backgroundColor: theme.inputBackground,
      borderColor: erros[campo]
        ? corErro
        : campoFocado === campo
        ? theme.primary
        : theme.border,
    },
  ];

  return (
    <LinearGradient colors={gradientColors} style={styles.background}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <View style={styles.headerTheme}>
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
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
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.containerCentro}>
              <Image
                source={require('../../assets/images/logo_tela.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logotipo do Dominical App"
              />

              <Text style={[styles.h1, { color: theme.text }]}>Bem-vindo de volta</Text>
              <Text style={[styles.p, { color: theme.subtext }]}>
                Entre com a sua conta para continuar
              </Text>

              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {/* E-mail */}
                <Text style={[styles.label, { color: theme.text }]}>E-mail</Text>
                <View style={estiloCampo('email')}>
                  <Ionicons name="mail-outline" size={20} color={corPlaceholder} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="nome@exemplo.com"
                    placeholderTextColor={corPlaceholder}
                    value={email}
                    onChangeText={alterarEmail}
                    onFocus={() => setCampoFocado('email')}
                    onBlur={() => sairDoCampo('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => senhaRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Campo de e-mail"
                  />
                </View>
                {!!erros.email && (
                  <View style={styles.erroLinha} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={14} color={corErro} />
                    <Text style={[styles.erroTexto, { color: corErro }]}>{erros.email}</Text>
                  </View>
                )}

                {/* Senha */}
                <Text style={[styles.label, styles.labelSpacing, { color: theme.text }]}>
                  Senha
                </Text>
                <View style={estiloCampo('senha')}>
                  <Ionicons name="lock-closed-outline" size={20} color={corPlaceholder} />
                  <TextInput
                    ref={senhaRef}
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Digite a sua senha"
                    placeholderTextColor={corPlaceholder}
                    value={senha}
                    onChangeText={alterarSenha}
                    onFocus={() => setCampoFocado('senha')}
                    onBlur={() => sairDoCampo('senha')}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleEntrar}
                    accessibilityLabel="Campo de senha"
                  />
                  <TouchableOpacity
                    onPress={() => setMostrarSenha((v) => !v)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    style={styles.olho}
                  >
                    <Ionicons
                      name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={corPlaceholder}
                    />
                  </TouchableOpacity>
                </View>
                {!!erros.senha && (
                  <View style={styles.erroLinha} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={14} color={corErro} />
                    <Text style={[styles.erroTexto, { color: corErro }]}>{erros.senha}</Text>
                  </View>
                )}

                {/* Aviso */}
                {!!aviso && (
                  <View
                    style={[
                      styles.aviso,
                      { backgroundColor: theme.inputBackground, borderColor: avisoCor },
                    ]}
                    accessibilityLiveRegion="polite"
                  >
                    <Ionicons
                      name={aviso.tipo === 'sucesso' ? 'checkmark-circle' : 'alert-circle'}
                      size={18}
                      color={avisoCor}
                    />
                    <Text style={[styles.avisoTexto, { color: theme.text }]}>{aviso.texto}</Text>
                  </View>
                )}

                {/* Botão de Entrar */}
                <TouchableOpacity
                  style={[styles.botaoEntrar, carregando && styles.botaoDesativado]}
                  onPress={handleEntrar}
                  disabled={carregando}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Entrar"
                >
                  {carregando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="log-in-outline" size={20} color="#FFF" />
                  )}
                  <Text style={styles.botaoEntrarTexto}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
                </TouchableOpacity>
              </View>

              {/* Link para cadastro */}
              <View style={styles.cadastroLinha}>
                <Text style={[styles.cadastroTexto, { color: theme.subtext }]}>
                  Ainda não tem conta?
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(ROTA_CADASTRO)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="link"
                  accessibilityLabel="Criar conta"
                >
                  <Text style={[styles.cadastroLink, { color: corLink }]}>Criar conta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { flex: 1 },
  headerTheme: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  containerCentro: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  logo: {
    width: 240,
    height: 96,
    marginBottom: 12,
  },
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  p: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelSpacing: {
    marginTop: 16,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    marginLeft: 10,
  },
  olho: {
    marginLeft: 8,
  },
  erroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  erroTexto: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 13,
  },
  botaoEntrar: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 12,
    marginTop: 24,
  },
  botaoEntrarTexto: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  botaoDesativado: {
    opacity: 0.7,
  },
  cadastroLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 24,
  },
  cadastroTexto: {
    fontSize: 14,
  },
  cadastroLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});