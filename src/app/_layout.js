import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { supabase } from '../supabase';
import * as Linking from 'expo-linking';

export default function Layout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Trata a URL inicial caso a app tenha sido aberta através de um link externo
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // 2. Ouve eventos de links disparados enquanto a app já está em execução
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (url) => {
    if (url.includes('access_token') || url.includes('refresh_token')) {
      try {
        const hashIndex = url.indexOf('#');
        const queryStringIndex = url.indexOf('?');
        
        let queryParams = {};
        if (hashIndex !== -1) {
          const hashStr = url.substring(hashIndex + 1);
          queryParams = Object.fromEntries(new URLSearchParams(hashStr));
        } else if (queryStringIndex !== -1) {
          const queryStr = url.substring(queryStringIndex + 1);
          queryParams = Object.fromEntries(new URLSearchParams(queryStr));
        }

        const { access_token, refresh_token } = queryParams;

        if (access_token && refresh_token) {
          // Define a sessão automaticamente no Supabase com os tokens recebidos
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            // Redireciona o utilizador diretamente para a tela 'home' após confirmar
            router.replace('/home');
          }
        }
      } catch (error) {
        console.error('Erro ao processar o deep link de autenticação:', error);
      }
    }
  };

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