import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext'; // Importação do contexto de tema

export default function Home() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme(); // Consumo do tema global

  // Cores de fundo dinâmicas para o gradiente de acordo com o tema escolhido
  const gradientColors = isDarkMode
    ? ['#0f172a', '#1e3a8a'] // Escuro (Dark)
    : ['#f8fafc', '#e2e8f0']; // Claro (Light)

  return (
    <SafeAreaProvider>
      <LinearGradient colors={gradientColors} style={styles.background}>
        <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />
        
        <SafeAreaView style={{ flex: 1 }}>
          {/* Botão de Alternância de Tema no Topo */}
          <View style={styles.headerTheme}>
            <TouchableOpacity
              onPress={toggleTheme}
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

          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.containerCentro}>

              {/* LOGÓTIPO COM CONTAINER DINÂMICO PARA EVITAR FONTE SUMINDO NO LIGHT MODE */}
              <View
                style={[
                  styles.logoContainer,
                  {
                    backgroundColor: isDarkMode ? 'transparent' : '#0F172A',
                    borderColor: isDarkMode ? 'transparent' : '#1E293B',
                    borderWidth: isDarkMode ? 0 : 1,
                  },
                ]}
              >
                <Image
                  source={require('../../assets/images/logo_tela.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.h1, { color: theme.text }]}>Dominical App</Text>
              <Text style={[styles.p, { color: theme.subtext }]}>Escolha o seu perfil</Text>

              <View style={styles.perfis}>
                <TouchableOpacity
                  style={[
                    styles.perfil,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : theme.card,
                      borderColor: theme.border,
                      borderWidth: isDarkMode ? 0 : 1,
                    },
                  ]}
                  onPress={() => router.push('/screens/professor')}
                >
                  <View style={[styles.avatar, styles.professor]}>
                    <Text style={styles.avatarIcone}>👨‍🏫</Text>
                  </View>
                  <Text
                    style={[styles.perfilH2, { color: theme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Professor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.perfil,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : theme.card,
                      borderColor: theme.border,
                      borderWidth: isDarkMode ? 0 : 1,
                    },
                  ]}
                  onPress={() => router.push('/screens/superintendente')}
                >
                  <View style={[styles.avatar, styles.superintendente]}>
                    <Text style={styles.avatarIcone}>👨‍💼</Text>
                  </View>
                  <Text
                    style={[styles.perfilH2, { color: theme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Superintendente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.perfil,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : theme.card,
                      borderColor: theme.border,
                      borderWidth: isDarkMode ? 0 : 1,
                    },
                  ]}
                  onPress={() => router.push('/screens/aluno')}
                >
                  <View style={[styles.avatar, styles.aluno]}>
                    <Text style={styles.avatarIcone}>🎓</Text>
                  </View>
                  <Text
                    style={[styles.perfilH2, { color: theme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    Aluno
                  </Text>
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
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 100,
  },
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  p: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  perfis: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
    width: '100%',
  },
  perfil: {
    width: 220,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});