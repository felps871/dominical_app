import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { supabase } from '../supabase';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

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
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            router.replace('/(tabs)/superintendente');
          }
        }
      } catch (error) {
        console.error('Erro ao processar o deep link de autenticação:', error);
      }
    }
  };

  return (
    <ThemeProvider>
      {/* O Expo Router mapeia automaticamente todos os ficheiros e pastas dentro de src/app/ */}
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}