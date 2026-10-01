import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  FlatList 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase'; // Ajuste o caminho até ao seu ficheiro supabase.js

export default function AlunoScreen() {
  const router = useRouter();
  const [licoes, setLicoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Procura as lições na base de dados assim que a tela abre
  
  useEffect(() => {
    fetchLicoes();
  }, []);

  const fetchLicoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('licoes')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lições:', error.message);
      } else {
        setLicoes(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.background}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.h1}>Painel do Aluno</Text>
          <Text style={styles.p}>Próximas Lições Agendadas</Text>

          {/* Indicador de Carregamento */}
          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
          ) : licoes.length === 0 ? (
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitulo}>Nenhuma lição cadastrada</Text>
              <Text style={styles.cardSub}>O superintendente ainda não lançou as próximas aulas.</Text>
            </View>
          ) : (
            /* Lista de Lições Cadastradas */
            licoes.map((item) => (
              <View key={item.id} style={styles.cardInfo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.badgeClasse}>{item.classe}</Text>
                  <Text style={styles.cardData}>📅 {item.data}</Text>
                </View>
                <Text style={styles.cardTitulo}>{item.titulo}</Text>
                <Text style={styles.cardSub}>👨‍🏫 Professor: {item.professor}</Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Voltar / Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', padding: 20 },
  h1: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  p: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  cardInfo: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 8, 
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
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
  },
  cardData: { fontSize: 12, color: '#38bdf8', fontWeight: 'bold' },
  cardTitulo: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#cbd5e1' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, marginTop: 24, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});