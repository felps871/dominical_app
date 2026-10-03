import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function RelatoriosScreen() {
  const { theme, isDarkMode } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' },
      ]}
    >
      <StatusBar barStyle={theme.statusBar} />

      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDarkMode
                ? 'rgba(245, 158, 11, 0.15)'
                : '#FEF3C7',
            },
          ]}
        >
          <Ionicons name="construct-outline" size={48} color="#D97706" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          EM CONSTRUÇÃO
        </Text>

        <Text style={[styles.sub, { color: theme.subtext }]}>
          Esta funcionalidade estará disponível em breve! 🚀
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    textAlign: 'center',
  },
});