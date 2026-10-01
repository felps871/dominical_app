import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaProvider>
      <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.background}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.containerCentro}>

              {/* LOGÓTIPO ADICIONADO AQUI */}
              <Image
                source={require('../../assets/images/logo_app.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.h1}>Dominical App</Text>
              <Text style={styles.p}>Escolha o seu perfil</Text>

              <View style={styles.perfis}>
                <TouchableOpacity
                  style={styles.perfil}
                  onPress={() => router.push('/screens/professor')}
                >
                  <View style={[styles.avatar, styles.professor]}>
                    <Text style={styles.avatarIcone}>👨‍🏫</Text>
                  </View>
                  <Text style={styles.perfilH2}>Professor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.perfil}
                  onPress={() => router.push('/screens/superintendente')}
                >
                  <View style={[styles.avatar, styles.superintendente]}>
                    <Text style={styles.avatarIcone}>👨‍💼</Text>
                  </View>
                  <Text style={styles.perfilH2}>Superintendente</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.perfil}
                  onPress={() => router.push('/screens/aluno')}
                >
                  <View style={[styles.avatar, styles.aluno]}>
                    <Text style={styles.avatarIcone}>🎓</Text>
                  </View>
                  <Text style={styles.perfilH2}>Aluno</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}



const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justify: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  containerCentro: {
    alignItems: 'center',
    width: '100%',
  },
  // ESTILO ADICIONADO PARA O LOGÓTIPO
  logo: {
  width: 700,
  height: 120,
  marginBottom: 15,    
},
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
  },
  p: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 15,
  },
  perfis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  perfil: {
    width: 200,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcone: {
    fontSize: 45,
  },
  professor: {
    backgroundColor: '#2563eb',
  },
  superintendente: {
    backgroundColor: '#7c3aed',
  },
  aluno: {
    backgroundColor: '#059669',
  },
  perfilH2: {
    marginTop: 15,
    fontSize: 20,
    color: 'white',
    fontWeight: 'normal',
  },
});