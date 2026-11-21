import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
// ATENÇÃO: ajuste os caminhos abaixo para ficarem iguais aos do seu cadastrar-licao.js
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TIPO_ALUNO = 'aluno'; // valor de users.tipo_usuario que representa o aluno

const diaVazio = () => ({ referencia: '', titulo: '' });
const diasVazios = () => DIAS.map(diaVazio);

// ---------- Datas ----------
const paraISO = (d) => {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const formatarDM = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
// Ex.: "seg 23/11" (mostra o dia da semana para facilitar a conferência)
const formatarComDia = (d) => `${NOMES_DIA[d.getDay()]} ${formatarDM(d)}`;

// Sexta a domingo prepara a semana seguinte; segunda a quinta edita a semana atual
const segundaPadrao = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=dom ... 6=sáb
  if (dow === 0) d.setDate(d.getDate() + 1);
  else if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 5) d.setDate(d.getDate() + 3);
  else d.setDate(d.getDate() - (dow - 1));
  return d;
};

// Dada qualquer data, devolve a segunda-feira da semana (seg a sáb) que a contém.
// Domingo conta para a semana seguinte (mesma regra da abertura da tela).
const segundaDe = (data) => {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=dom ... 6=sáb
  d.setDate(d.getDate() + (dow === 0 ? 1 : 1 - dow));
  return d;
};

export default function LeituraSemanal() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  const [semana, setSemana] = useState(segundaPadrao());
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [classe, setClasse] = useState(null); // null = todas as classes
  const [classes, setClasses] = useState([]);

  const [leituraId, setLeituraId] = useState(null);
  const [status, setStatus] = useState(null); // 'rascunho' | 'publicada' | null
  const [tema, setTema] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [dias, setDias] = useState(diasVazios());

  const [leituraDias, setLeituraDias] = useState([]); // [{id, dia_semana}]
  const [lidosPorDia, setLidosPorDia] = useState({}); // { dia_semana: quantidade }
  const [totalAlunos, setTotalAlunos] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const semanaISO = paraISO(semana);
  const sabado = new Date(semana);
  sabado.setDate(sabado.getDate() + 5);
  const domingo = new Date(semana);
  domingo.setDate(domingo.getDate() + 6);

  const aoEscolherData = (event, data) => {
    if (Platform.OS === 'android') setMostrarPicker(false);
    if (event?.type === 'dismissed' || !data) return;
    setSemana(segundaDe(data));
  };

  const irParaHoje = (diasAFrente) => {
    const d = new Date();
    d.setDate(d.getDate() + diasAFrente);
    setSemana(segundaDe(d));
  };

  // ---------- Cores (mesma lógica do Home) ----------
  const corFundo = theme.background || (isDarkMode ? '#0F172A' : '#F8FAFC');
  const corCard = theme.card || (isDarkMode ? '#1E293B' : '#FFFFFF');
  const corBorda = theme.border || (isDarkMode ? '#334155' : '#E2E8F0');
  const corTexto = theme.text || (isDarkMode ? '#F8FAFC' : '#0F172A');
  const corSub = theme.subtext || (isDarkMode ? '#94A3B8' : '#64748B');
  const corInput = isDarkMode ? '#0F172A' : '#F8FAFC';
  const inputStyle = [styles.input, { color: corTexto, borderColor: corBorda, backgroundColor: corInput }];

  // ---------- Classes disponíveis ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('licoes').select('classe');
      const unicas = [...new Set((data || []).map((l) => l.classe).filter(Boolean))].sort();
      setClasses(unicas);
    })();
  }, []);

  // ---------- Carrega a leitura da semana + classe escolhidas ----------
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      let q = supabase
        .from('leituras_semanais')
        .select('id, tema, mensagem, status, leitura_dias(id, dia_semana, referencia, titulo)')
        .eq('semana_inicio', semanaISO);
      q = classe ? q.eq('classe', classe) : q.is('classe', null);

      const { data, error } = await q.maybeSingle();
      if (error) throw error;

      if (!data) {
        setLeituraId(null);
        setStatus(null);
        setTema('');
        setMensagem('');
        setDias(diasVazios());
        setLeituraDias([]);
        setLidosPorDia({});
      } else {
        const novos = diasVazios();
        (data.leitura_dias || []).forEach((d) => {
          novos[d.dia_semana - 1] = { referencia: d.referencia, titulo: d.titulo };
        });
        setLeituraId(data.id);
        setStatus(data.status);
        setTema(data.tema || '');
        setMensagem(data.mensagem || '');
        setDias(novos);
        setLeituraDias((data.leitura_dias || []).map((d) => ({ id: d.id, dia_semana: d.dia_semana })));

        // Acompanhamento: quantos alunos leram cada dia
        const ids = (data.leitura_dias || []).map((d) => d.id);
        const contagem = {};
        if (ids.length > 0) {
          const { data: prog } = await supabase
            .from('leitura_progresso')
            .select('leitura_dia_id')
            .in('leitura_dia_id', ids);
          (data.leitura_dias || []).forEach((d) => {
            contagem[d.dia_semana] = (prog || []).filter((p) => p.leitura_dia_id === d.id).length;
          });
        }
        setLidosPorDia(contagem);
      }

      // Total de alunos (da classe, ou de todas)
      let qa = supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tipo_usuario', TIPO_ALUNO);
      if (classe) qa = qa.eq('classe', classe);
      const { count } = await qa;
      setTotalAlunos(count || 0);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar a leitura: ' + (e.message || e));
    } finally {
      setCarregando(false);
    }
  }, [semanaISO, classe]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ---------- Edição ----------
  const mudarDia = (indice, campo, valor) => {
    setDias((atual) => atual.map((d, i) => (i === indice ? { ...d, [campo]: valor } : d)));
  };

  const mudarSemana = (delta) => {
    const nova = new Date(semana);
    nova.setDate(nova.getDate() + delta * 7);
    setSemana(nova);
  };

  // ---------- Salvar / Publicar ----------
  const salvar = async (publicar) => {
    // Valida: dia com só um dos campos preenchido é erro
    for (let i = 0; i < dias.length; i++) {
      const ref = dias[i].referencia.trim();
      const tit = dias[i].titulo.trim();
      if ((ref && !tit) || (!ref && tit)) {
        Alert.alert('Atenção', `${DIAS[i]}: preencha a referência e o título, ou deixe os dois vazios.`);
        return;
      }
    }
    const preenchidos = dias.filter((d) => d.referencia.trim() && d.titulo.trim());
    if (preenchidos.length === 0) {
      Alert.alert('Atenção', 'Preencha pelo menos um dia da semana.');
      return;
    }

    setSalvando(true);
    try {
      // Publicando uma semana futura: libera sozinha na segunda às 00h
      const inicio = new Date(semana);
      inicio.setHours(0, 0, 0, 0);
      const agora = new Date();
      const agendada = publicar && inicio > agora;
      const publicarEm = agendada ? inicio.toISOString() : agora.toISOString();

      const payload = {
        classe,
        tema: tema.trim() || null,
        semana_inicio: semanaISO,
        mensagem: mensagem.trim() || null,
        publicar_em: publicarEm,
        status: publicar ? 'publicada' : 'rascunho',
      };

      let id = leituraId;
      if (id) {
        const { error } = await supabase.from('leituras_semanais').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('leituras_semanais')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
      }

      // Dias preenchidos: cria ou atualiza
      const linhas = dias
        .map((d, i) => ({
          leitura_id: id,
          dia_semana: i + 1,
          referencia: d.referencia.trim(),
          titulo: d.titulo.trim(),
        }))
        .filter((l) => l.referencia && l.titulo);

      const { error: errDias } = await supabase
        .from('leitura_dias')
        .upsert(linhas, { onConflict: 'leitura_id,dia_semana' });
      if (errDias) throw errDias;

      // Dias que ficaram vazios: remove
      const vazios = dias.map((d, i) => i + 1).filter((n) => !linhas.some((l) => l.dia_semana === n));
      if (vazios.length > 0) {
        const { error: errDel } = await supabase
          .from('leitura_dias')
          .delete()
          .eq('leitura_id', id)
          .in('dia_semana', vazios);
        if (errDel) throw errDel;
      }

      Alert.alert(
        publicar ? 'Publicada 🎉' : 'Rascunho salvo',
        publicar
          ? agendada
            ? `A leitura será liberada para os alunos na segunda-feira, ${formatarDM(semana)}.`
            : 'A leitura já está disponível para os alunos.'
          : 'Você pode continuar editando e publicar depois.'
      );
      carregar();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar: ' + (e.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const despublicar = () => {
    Alert.alert('Despublicar', 'Os alunos deixarão de ver esta leitura. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Despublicar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('leituras_semanais')
            .update({ status: 'rascunho' })
            .eq('id', leituraId);
          if (error) Alert.alert('Erro', error.message);
          else carregar();
        },
      },
    ]);
  };

  // ---------- Tela ----------
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: corFundo }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Leitura semanal</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Seletor de semana */}
          <View style={[styles.card, { backgroundColor: corCard, borderColor: corBorda }]}>
            <View style={styles.semanaRow}>
              <TouchableOpacity onPress={() => mudarSemana(-1)} style={styles.setaBtn}>
                <Ionicons name="chevron-back" size={22} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.periodoBtn}
                onPress={() => setMostrarPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.periodoLinha}>
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                  <Text style={[styles.semanaTexto, { color: corTexto }]}>
                    {formatarComDia(semana)} a {formatarComDia(sabado)}
                  </Text>
                </View>
                <Text style={{ color: corSub, fontSize: 12, marginTop: 2 }}>
                  Lição de domingo, {formatarDM(domingo)}/{domingo.getFullYear()}
                </Text>
                <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                  Toque para escolher a data
                </Text>
                {status && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: status === 'publicada' ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)' },
                    ]}
                  >
                    <Text
                      style={{
                        color: status === 'publicada' ? '#16A34A' : '#D97706',
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {status === 'publicada' ? 'Publicada' : 'Rascunho'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => mudarSemana(1)} style={styles.setaBtn}>
                <Ionicons name="chevron-forward" size={22} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.atalhosRow}>
              <TouchableOpacity
                style={[styles.atalho, { borderColor: corBorda, backgroundColor: corInput }]}
                onPress={() => irParaHoje(0)}
              >
                <Text style={[styles.atalhoTexto, { color: corTexto }]}>Esta semana</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.atalho, { borderColor: corBorda, backgroundColor: corInput }]}
                onPress={() => irParaHoje(7)}
              >
                <Text style={[styles.atalhoTexto, { color: corTexto }]}>Próxima semana</Text>
              </TouchableOpacity>
            </View>

            {mostrarPicker && (
              <View style={{ marginBottom: 16 }}>
                <DateTimePicker
                  value={semana}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  locale="pt-BR"
                  onChange={aoEscolherData}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.btnConfirmarData} onPress={() => setMostrarPicker(false)}>
                    <Text style={styles.btnConfirmarDataTexto}>Confirmar data</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={[styles.rotulo, { color: corSub }]}>Para qual classe?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[null, ...classes].map((c) => {
                const ativo = classe === c;
                return (
                  <TouchableOpacity
                    key={c || 'todas'}
                    onPress={() => setClasse(c)}
                    style={[
                      styles.chip,
                      { borderColor: ativo ? '#2563EB' : corBorda, backgroundColor: ativo ? '#2563EB' : corInput },
                    ]}
                  >
                    <Text style={{ color: ativo ? '#FFF' : corTexto, fontWeight: '600', fontSize: 13 }}>
                      {c || 'Todas as classes'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {carregando ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Tema e mensagem */}
              <View style={[styles.card, { backgroundColor: corCard, borderColor: corBorda }]}>
                <Text style={[styles.rotulo, { color: corSub }]}>Tema da semana</Text>
                <TextInput
                  value={tema}
                  onChangeText={setTema}
                  placeholder="Ex.: A unidade da Igreja"
                  placeholderTextColor={corSub}
                  style={inputStyle}
                />
                <Text style={[styles.rotulo, { color: corSub, marginTop: 14 }]}>
                  Mensagem para os alunos (opcional)
                </Text>
                <TextInput
                  value={mensagem}
                  onChangeText={setMensagem}
                  placeholder="Um incentivo que aparece no topo da leitura"
                  placeholderTextColor={corSub}
                  multiline
                  style={[...inputStyle, { minHeight: 70, textAlignVertical: 'top' }]}
                />
              </View>

              {/* Os seis dias */}
              {DIAS.map((nome, i) => {
                const lidos = lidosPorDia[i + 1];
                const existe = leituraDias.some((d) => d.dia_semana === i + 1);
                return (
                  <View
                    key={nome}
                    style={[styles.card, { backgroundColor: corCard, borderColor: corBorda }]}
                  >
                    <View style={styles.diaTopo}>
                      <Text style={[styles.diaNome, { color: corTexto }]}>{nome}</Text>
                      {existe && status === 'publicada' && (
                        <Text style={{ color: corSub, fontSize: 12 }}>
                          {lidos || 0} de {totalAlunos} alunos leram
                        </Text>
                      )}
                    </View>
                    <TextInput
                      value={dias[i].referencia}
                      onChangeText={(v) => mudarDia(i, 'referencia', v)}
                      placeholder="Referência (ex.: Sl 133.1)"
                      placeholderTextColor={corSub}
                      autoCapitalize="sentences"
                      style={inputStyle}
                    />
                    <TextInput
                      value={dias[i].titulo}
                      onChangeText={(v) => mudarDia(i, 'titulo', v)}
                      placeholder="Título (ex.: A bênção de estar juntos)"
                      placeholderTextColor={corSub}
                      style={[...inputStyle, { marginTop: 10 }]}
                    />
                  </View>
                );
              })}

              {/* Ações */}
              <TouchableOpacity
                style={[styles.btnPrimario, salvando && { opacity: 0.6 }]}
                onPress={() => salvar(true)}
                disabled={salvando}
                activeOpacity={0.85}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
                    <Text style={styles.btnPrimarioTexto}>
                      {status === 'publicada' ? 'Atualizar leitura publicada' : 'Publicar leitura'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {status !== 'publicada' && (
                <TouchableOpacity
                  style={[styles.btnSecundario, { borderColor: corBorda }]}
                  onPress={() => salvar(false)}
                  disabled={salvando}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.btnSecundarioTexto, { color: corTexto }]}>Salvar rascunho</Text>
                </TouchableOpacity>
              )}

              {status === 'publicada' && (
                <TouchableOpacity onPress={despublicar} style={{ alignItems: 'center', padding: 10 }}>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>Despublicar</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  semanaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  setaBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  semanaTexto: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  periodoBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  periodoLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atalhosRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  atalho: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  atalhoTexto: { fontSize: 13, fontWeight: '600' },
  btnConfirmarData: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnConfirmarDataTexto: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  rotulo: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  diaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diaNome: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  btnPrimario: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimarioTexto: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btnSecundario: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecundarioTexto: { fontWeight: '700', fontSize: 14 },
});
