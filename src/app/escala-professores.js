import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabase';

// --- FUNÇÕES DE FORMATACÃO E LÓGICA ---
function formatDateToBR(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function convertBRToISO(dateBR) {
  const [day, month, year] = dateBR.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function generateQuarterSchedule({ startDateInput, totalLessons = 13, teachersByClass }) {
  const [day, month, year] = startDateInput.split('/').map(Number);
  const start = new Date(year, month - 1, day);
  
  const classes = Object.keys(teachersByClass);

  const parsedTeachers = {};
  classes.forEach((classe) => {
    parsedTeachers[classe] = teachersByClass[classe]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  });

  const classPointers = {};
  classes.forEach((classe) => (classPointers[classe] = 0));

  const scheduleList = [];

  for (let lessonIndex = 0; lessonIndex < totalLessons; lessonIndex++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + lessonIndex * 7);

    const dateBR = formatDateToBR(currentDate);
    const assignedToday = new Set();

    for (const classe of classes) {
      const teachersList = parsedTeachers[classe];
      if (!teachersList || teachersList.length === 0) continue;

      let chosenTeacher = '';
      let attempts = 0;

      while (attempts < teachersList.length) {
        const pointer = classPointers[classe];
        const candidate = teachersList[pointer];

        classPointers[classe] = (pointer + 1) % teachersList.length;

        if (!assignedToday.has(candidate)) {
          chosenTeacher = candidate;
          assignedToday.add(candidate);
          break;
        }
        attempts++;
      }

      if (!chosenTeacher) {
        chosenTeacher = teachersList[classPointers[classe]];
      }

      scheduleList.push({
        licaoNum: lessonIndex + 1,
        dataBR: dateBR,
        classe: classe,
        professor: chosenTeacher,
      });
    }
  }

  return scheduleList;
}

// --- COMPONENTE PRINCIPAL ---
export default function EscalaProfessores() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

  // Referência para captura da imagem
  const tableRef = useRef(null);

  const [startDateInput, setStartDateInput] = useState('04/10/2026');
  const [totalLessons, setTotalLessons] = useState('13');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState([]);

  const [teachersByClass, setTeachersByClass] = useState({
    ADULTOS: 'Pr.Sandro, Dc. Vanderley, Pr.Ronie, Pb.Júnior, Ev.J.Humberto, Ev.Elias',
    JOVENS: 'Aux.JP, Dc.Joelson, Dc.Henrique, Dc.Vanderley, Pr.Sandro',
    JUNIORES: 'Joelson, Erika, Felipe, Amanda, D.Joelson, Vanderley',
    CRIANÇAS: 'Amanda, Dorilene, Solange, Ana Luiza',
  });

  const handleGenerateSchedule = () => {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(startDateInput)) {
      Alert.alert('Erro', 'Informe a data no formato DD/MM/YYYY (ex: 04/10/2026)');
      return;
    }

    try {
      const result = generateQuarterSchedule({
        startDateInput,
        totalLessons: parseInt(totalLessons, 10) || 13,
        teachersByClass,
      });
      setGeneratedSchedule(result);
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  // Exportar a Tabela em Formato JPG Moderno
  const handleExportJPG = async () => {
    if (!tableRef.current) return;

    setExporting(true);
    try {
      const uri = await captureRef(tableRef, {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Sucesso', `Imagem gerada com sucesso em: ${uri}`);
      }
    } catch (error) {
      Alert.alert('Erro na exportação', 'Não foi possível gerar a imagem JPG.');
    } finally {
      setExporting(false);
    }
  };

  // Salvar no Banco de Dados (Publica oficialmente para os demais utilizadores)
  const handleSaveToSupabase = async () => {
    if (generatedSchedule.length === 0) {
      Alert.alert('Aviso', 'Gere uma escala primeiro.');
      return;
    }

    setLoading(true);
    try {
      const recordsToInsert = generatedSchedule.map((item) => ({
        classe: item.classe,
        data: convertBRToISO(item.dataBR),
        titulo: `Lição ${item.licaoNum}`,
        professor: item.professor,
      }));

      const { error } = await supabase.from('licoes').insert(recordsToInsert);

      if (error) throw error;

      Alert.alert('Publicado!', 'A escala foi salva e já está visível para os professores e alunos.');
      router.back();
    } catch (err) {
      Alert.alert('Erro ao Salvar', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Monta as linhas agrupadas por lição para a tabela
  const classesList = Object.keys(teachersByClass);
  const lessonsCount = parseInt(totalLessons, 10) || 13;
  const lessonsRows = [];

  for (let lNum = 1; lNum <= lessonsCount; lNum++) {
    const itemsForLesson = generatedSchedule.filter((item) => item.licaoNum === lNum);
    const dateStr = itemsForLesson[0]?.dataBR || '';

    lessonsRows.push(
      <View key={lNum} style={styles.imageTableRow}>
        <Text style={styles.imageCellLesson}>{lNum} - {dateStr}</Text>
        {classesList.map((c) => {
          const item = itemsForLesson.find((i) => i.classe === c);
          return (
            <Text key={c} style={styles.imageCellTeacher}>
              {item ? item.professor : '-'}
            </Text>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]}>
      <StatusBar barStyle={theme?.statusBar || 'default'} backgroundColor="transparent" translucent />

      <View style={[styles.header, { backgroundColor: isDarkMode ? '#020617' : '#0F172A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escala Automática (Superintendência) 📅</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Painel de Parâmetros */}
        <View style={[styles.card, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFF' }]}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>Parâmetros do Trimestre</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Data 1º Domingo (DD/MM/YYYY):</Text>
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#000' }]}
              value={startDateInput}
              onChangeText={setStartDateInput}
              placeholder="04/10/2026"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Nº de Lições:</Text>
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#000' }]}
              value={totalLessons}
              onChangeText={setTotalLessons}
              keyboardType="numeric"
            />
          </View>

          <Text style={[styles.sectionSubtitle, { color: isDarkMode ? '#FFF' : '#000' }]}>Professores por Turma</Text>

          {Object.keys(teachersByClass).map((classe) => (
            <View key={classe} style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{classe}:</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#FFF' : '#000' }]}
                value={teachersByClass[classe]}
                onChangeText={(text) => setTeachersByClass((prev) => ({ ...prev, [classe]: text }))}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateSchedule}>
            <Ionicons name="eye-outline" size={20} color="#FFF" />
            <Text style={styles.btnText}>Gerar Pré-visualização Privada</Text>
          </TouchableOpacity>
        </View>

        {/* Pré-visualização Privada do Superintendente (Capturável em JPG) */}
        {generatedSchedule.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewTitle, { color: isDarkMode ? '#FFF' : '#000' }]}>
              🔒 Pré-visualização Exclusiva (Superintendência)
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <ViewShot ref={tableRef} options={{ format: 'jpg', quality: 0.95 }}>
                <View style={styles.imageCardContainer}>
                  {/* Cabeçalho da Imagem JPG */}
                  <View style={styles.imageHeader}>
                    <Text style={styles.imageHeaderTitle}>ESCALA DE PROFESSORES EBD</Text>
                    <Text style={styles.imageHeaderSub}>ESCOLA BÍBLICA DOMINICAL</Text>
                    <View style={styles.badgeWarning}>
                      <Text style={styles.badgeWarningText}>
                        OBS: É RESPONSABILIDADE DO PROFESSOR ESCALADO AVISAR COM 48H DE ANTECEDÊNCIA EM CASO DE TROCA
                      </Text>
                    </View>
                  </View>

                  {/* Tabela de Dados */}
                  <View style={styles.imageTable}>
                    <View style={styles.imageTableHeader}>
                      <Text style={styles.imageCellHeaderLesson}>LIÇÃO / DATA</Text>
                      {classesList.map((c) => (
                        <Text key={c} style={styles.imageCellHeaderTeacher}>{c}</Text>
                      ))}
                    </View>
                    {lessonsRows}
                  </View>
                </View>
              </ViewShot>
            </ScrollView>

            {/* Ações da Escala */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
                onPress={handleExportJPG}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Gerar & Compartilhar JPG</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                onPress={handleSaveToSupabase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                    <Text style={styles.btnText}>Publicar para Todos no App</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  sectionSubtitle: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  inputGroup: { marginBottom: 10 },
  label: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#475569', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  generateBtn: { backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginTop: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  
  // Estilos da Pré-visualização
  previewSection: { marginTop: 10, marginBottom: 30 },
  previewTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  actionsContainer: { gap: 10, marginTop: 16 },
  exportBtn: { backgroundColor: '#D97706', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8 },
  saveBtn: { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8 },

  // Estilos do Card Moderno Renderizado na Imagem JPG
  imageCardContainer: {
    backgroundColor: '#0F172A',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 550,
  },
  imageHeader: { alignItems: 'center', marginBottom: 16 },
  imageHeaderTitle: { color: '#38BDF8', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  imageHeaderSub: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginTop: 2 },
  badgeWarning: { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  badgeWarningText: { color: '#FCA5A5', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
  imageTable: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B' },
  imageTableHeader: { flexDirection: 'row', backgroundColor: '#1E293B', paddingVertical: 10 },
  imageTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0F172A', paddingVertical: 8 },
  imageCellHeaderLesson: { width: 130, color: '#38BDF8', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  imageCellHeaderTeacher: { width: 100, color: '#38BDF8', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  imageCellLesson: { width: 130, color: '#F8FAFC', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  imageCellTeacher: { width: 100, color: '#CBD5E1', fontSize: 11, textAlign: 'center' },
});