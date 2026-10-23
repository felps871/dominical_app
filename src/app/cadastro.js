import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { cadastrarUsuario } from '../services/Authservice'; // Certifique-se que aponta para o serviço do Supabase

const ROTA_LOGIN = '/';

const SENHA_MINIMA = 5;

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

const OPCOES_TIPO = [
  { valor: 'aluno', rotulo: 'Aluno', emoji: '🎓', cor: '#059669' },
  { valor: 'professor', rotulo: 'Professor', emoji: '👨‍🏫', cor: '#2563eb' },
];

const OPCOES_CLASSE = [
  { valor: 'Adultos', rotulo: 'Adultos', emoji: '🧑‍🎓', cor: '#059669' },
  { valor: 'Jovens', rotulo: 'Jovens', emoji: '🧑‍🎓', cor: '#2563eb' },
  { valor: 'Juniores', rotulo: 'Juniores', emoji: '🧑‍🎓', cor: '#f59e0b' },
  { valor: 'Crianças', rotulo: 'Crianças', emoji: '🧑‍🎓', cor: '#d97706' },
];

const validarNome = (valor) => {
  if (!valor.trim()) return 'Informe o seu nome completo.';
  return '';
};

const validarEmail = (valor) => {
  const email = valor.trim();
  if (!email) return 'Informe o seu e-mail.';
  if (!emailTemFormatoValido(email)) return 'Digite um e-mail válido, como nome@exemplo.com';
  return '';
};

const validarSenha = (valor) => {
  if (!valor) return 'Crie uma senha.';
  if (valor.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  return '';
};

const validarConfirmacao = (senha, confirmacao) => {
  if (!confirmacao) return 'Digite a senha novamente para confirmar.';
  if (senha !== confirmacao) return 'As senhas não coincidem.';
  return '';
};

const validarTipo = (valor) => {
  if (!valor) return 'Selecione se você é Aluno ou Professor.';
  return '';
};

const useCores = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  return {
    theme,
    isDarkMode,
    toggleTheme,
    corErro: isDarkMode ? '#F87171' : '#DC2626',
    corLink: isDarkMode ? '#60A5FA' : '#2563EB',
    corPlaceholder: isDarkMode ? '#94A3B8' : '#64748B',
  };
};

function MensagemErro({ texto }) {
  const { corErro } = useCores();
  if (!texto) return null;
  return (
    <View style={styles.erroLinha} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={14} color={corErro} />
      <Text style={[styles.erroTexto, { color: corErro }]}>{texto}</Text>
    </View>
  );
}

function Campo({ label, icone, erro, inputRef, acessorio, onFocus, onBlur, ...inputProps }) {
  const { theme, corErro, corPlaceholder } = useCores();
  const [focado, setFocado] = useState(false);

  return (
    <View style={styles.grupo}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.campo,
          {
            backgroundColor: theme.inputBackground,
            borderColor: erro ? corErro : focado ? theme.primary : theme.border,
          },
        ]}
      >
        <Ionicons name={icone} size={20} color={corPlaceholder} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={corPlaceholder}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {acessorio}
      </View>
      <MensagemErro texto={erro} />
    </View>
  );
}

function BotaoOlho({ visivel, onPress, rotulo }) {
  const { corPlaceholder } = useCores();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
      style={styles.olho}
    >
      <Ionicons
        name={visivel ? 'eye-off-outline' : 'eye-outline'}
        size={22}
        color={corPlaceholder}
      />
    </TouchableOpacity>
  );
}

function SeletorTipo({ valor, onChange, erro, desativado }) {
  const { theme, isDarkMode, corLink, corErro } = useCores();
  const fundoSelecionado = isDarkMode ? 'rgba(59, 130, 246, 0.18)' : 'rgba(37, 99, 235, 0.08)';

  return (
    <View style={styles.grupo}>
      <Text style={[styles.label, { color: theme.text }]}>Tipo de usuário</Text>
      <View
        style={styles.opcoesTipo}
        accessibilityRole="radiogroup"
        accessibilityLabel="Tipo de usuário"
      >
        {OPCOES_TIPO.map((opcao) => {
          const selecionado = valor === opcao.valor;
          return (
            <TouchableOpacity
              key={opcao.valor}
              onPress={() => onChange(opcao.valor)}
              disabled={desativado}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={opcao.rotulo}
              accessibilityState={{ checked: selecionado, disabled: desativado }}
              style={[
                styles.opcaoTipo,
                {
                  backgroundColor: selecionado ? fundoSelecionado : theme.inputBackground,
                  borderColor: selecionado ? theme.primary : erro ? corErro : theme.border,
                },
              ]}
            >
              {selecionado && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={corLink}
                  style={styles.opcaoCheck}
                />
              )}
              <View style={[styles.opcaoAvatar, { backgroundColor: opcao.cor }]}>
                <Text style={styles.opcaoEmoji}>{opcao.emoji}</Text>
              </View>
              <Text
                style={[
                  styles.opcaoRotulo,
                  { color: theme.text, fontWeight: selecionado ? '700' : '600' },
                ]}
              >
                {opcao.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <MensagemErro texto={erro} />
    </View>
  );
}

export default function Cadastro() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme, corErro, corLink } = useCores();

  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmacaoRef = useRef(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [classe, setClasse] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [erros, setErros] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmacao: '',
    tipoUsuario: '',
  });
  const [aviso, setAviso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const gradientColors = isDarkMode ? ['#0f172a', '#1e3a8a'] : ['#f8fafc', '#e2e8f0'];
  const avisoCor = corErro;

  const atualizar = (campo, setter) => (valor) => {
    setter(valor);
    setAviso(null);
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: '' }));
  };

  const selecionarTipo = (valor) => {
    Keyboard.dismiss();
    atualizar('tipoUsuario', setTipoUsuario)(valor);

    if (valor === 'professor') {
      setClasse('');
    }

    setErros((atual) => ({
      ...atual,
      classe: '',
    }));
  };

  const handleCriarConta = async () => {
    if (carregando) return;
    Keyboard.dismiss();
    setAviso(null);

    const novosErros = {
      nome: validarNome(nome),
      email: validarEmail(email),
      senha: validarSenha(senha),
      confirmacao: validarConfirmacao(senha, confirmacao),
      tipoUsuario: validarTipo(tipoUsuario),
      classe:
        tipoUsuario === 'aluno' && !classe ? 'Selecione a sua classe.' : '',
    };
    setErros(novosErros);
    if (Object.values(novosErros).some(Boolean)) return;

    setCarregando(true);
    try {
      const resultado = await cadastrarUsuario({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        tipoUsuario,
        classe: tipoUsuario === 'aluno' ? classe : null,
      });

      if (resultado.status === 'sucesso') {
        router.replace({
          pathname: ROTA_LOGIN,
          params: { cadastro: 'ok', email: resultado.usuario.email },
        });
        return;
      }

      if (resultado.campo && resultado.campo in erros) {
        setErros((atual) => ({ ...atual, [resultado.campo]: resultado.mensagem }));
      } else {
        setAviso({ tipo: 'erro', texto: resultado.mensagem });
      }
    } catch (e) {
      console.warn('Erro inesperado no cadastro:', e?.name);
      setAviso({ tipo: 'erro', texto: 'Não foi possível concluir o cadastro. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  };

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

              <Text style={[styles.h1, { color: theme.text }]}>Crie a sua conta</Text>
              <Text style={[styles.p, { color: theme.subtext }]}>
                Preencha os dados abaixo para se cadastrar
              </Text>

              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Campo
                  label="Nome completo"
                  icone="person-outline"
                  placeholder="Seu nome e sobrenome"
                  value={nome}
                  onChangeText={atualizar('nome', setNome)}
                  erro={erros.nome}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!carregando}
                />

                <Campo
                  label="E-mail"
                  icone="mail-outline"
                  placeholder="nome@exemplo.com"
                  inputRef={emailRef}
                  value={email}
                  onChangeText={atualizar('email', setEmail)}
                  onBlur={() => {
                    if (email.length > 0) {
                      setErros((atual) => ({ ...atual, email: validarEmail(email) }));
                    }
                  }}
                  erro={erros.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => senhaRef.current?.focus()}
                  editable={!carregando}
                />

                <Campo
                  label="Senha"
                  icone="lock-closed-outline"
                  placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                  inputRef={senhaRef}
                  value={senha}
                  onChangeText={atualizar('senha', setSenha)}
                  erro={erros.senha}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmacaoRef.current?.focus()}
                  editable={!carregando}
                  acessorio={
                    <BotaoOlho
                      visivel={mostrarSenha}
                      onPress={() => setMostrarSenha((v) => !v)}
                      rotulo="senha"
                    />
                  }
                />

                <Campo
                  label="Digite a senha novamente"
                  icone="shield-checkmark-outline"
                  placeholder="Repita a senha"
                  inputRef={confirmacaoRef}
                  value={confirmacao}
                  onChangeText={atualizar('confirmacao', setConfirmacao)}
                  onBlur={() => {
                    if (confirmacao.length > 0) {
                      setErros((atual) => ({
                        ...atual,
                        confirmacao: validarConfirmacao(senha, confirmacao),
                      }));
                    }
                  }}
                  erro={erros.confirmacao}
                  secureTextEntry={!mostrarConfirmacao}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  editable={!carregando}
                  acessorio={
                    <BotaoOlho
                      visivel={mostrarConfirmacao}
                      onPress={() => setMostrarConfirmacao((v) => !v)}
                      rotulo="confirmação de senha"
                    />
                  }
                />

                <SeletorTipo
                  valor={tipoUsuario}
                  onChange={selecionarTipo}
                  erro={erros.tipoUsuario}
                  desativado={carregando}
                />

                {tipoUsuario === 'aluno' && (
                  <View style={styles.grupo}>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Selecione sua classe
                    </Text>

                    <View style={styles.opcoesClasse}>
                      {OPCOES_CLASSE.map((opcao) => {
                        const selecionada = classe === opcao.valor;

                        return (
                          <TouchableOpacity
                            key={opcao.valor}
                            onPress={() => {
                              setClasse(opcao.valor);
                              setErros((atual) => ({
                                ...atual,
                                classe: '',
                              }));
                              setAviso(null);
                            }}
                            disabled={carregando}
                            activeOpacity={0.8}
                            accessibilityRole="radio"
                            accessibilityLabel={opcao.rotulo}
                            accessibilityState={{ checked: selecionada }}
                            style={[
                              styles.opcaoClasse,
                              {
                                backgroundColor: selecionada
                                  ? isDarkMode
                                    ? 'rgba(59, 130, 246, 0.18)'
                                    : 'rgba(37, 99, 235, 0.08)'
                                  : theme.inputBackground,
                                borderColor: selecionada
                                  ? theme.primary
                                  : erros.classe
                                  ? corErro
                                  : theme.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                selecionada
                                  ? 'radio-button-on'
                                  : 'radio-button-off'
                              }
                              size={20}
                              color={selecionada ? corLink : theme.subtext}
                            />

                            <Text
                              style={[
                                styles.opcaoClasseTexto,
                                {
                                  color: theme.text,
                                  fontWeight: selecionada ? '700' : '500',
                                },
                              ]}
                            >
                              {opcao.rotulo}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <MensagemErro texto={erros.classe} />
                  </View>
                )}

                {!!aviso && (
                  <View
                    style={[
                      styles.aviso,
                      { backgroundColor: theme.inputBackground, borderColor: avisoCor },
                    ]}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <Ionicons name="alert-circle" size={20} color={avisoCor} />
                    <Text style={[styles.avisoTexto, { color: theme.text }]}>{aviso.texto}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.botaoPrincipal, carregando && styles.botaoDesativado]}
                  onPress={handleCriarConta}
                  disabled={carregando}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Criar conta"
                  accessibilityState={{ disabled: carregando, busy: carregando }}
                >
                  {carregando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="person-add-outline" size={20} color="#FFF" />
                  )}
                  <Text style={styles.botaoPrincipalTexto}>
                    {carregando ? 'Criando conta...' : 'Criar conta'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rodapeLinha}>
                <Text style={[styles.rodapeTexto, { color: theme.subtext }]}>Já tem conta?</Text>
                <TouchableOpacity
                  onPress={() => router.replace(ROTA_LOGIN)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="link"
                  accessibilityLabel="Voltar para o login"
                >
                  <Text style={[styles.rodapeLink, { color: corLink }]}>Entrar</Text>
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
    paddingBottom: 40,
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
  grupo: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  opcoesTipo: {
    flexDirection: 'row',
    gap: 12,
  },
  opcaoTipo: {
    flex: 1,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  opcaoCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  opcaoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  opcaoEmoji: {
    fontSize: 24,
  },
  opcaoRotulo: {
    fontSize: 15,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  botaoPrincipal: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 12,
    marginTop: 12,
  },
  botaoDesativado: {
    opacity: 0.7,
  },
  botaoPrincipalTexto: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rodapeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 24,
  },
  rodapeTexto: {
    fontSize: 14,
  },
  rodapeLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  opcoesClasse: {
    gap: 10,
  },
  opcaoClasse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  opcaoClasseTexto: {
    fontSize: 15,
  },
});