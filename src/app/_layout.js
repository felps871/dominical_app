import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="chamada" />
        <Stack.Screen name="assiduidade" />
        <Stack.Screen name="classes" />
        <Stack.Screen name="ausentes" />
        <Stack.Screen name="relatorios" />
      </Stack>
    </ThemeProvider>
  );
}