import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl ='https://kkaanxspuihtvhbkkcod.supabase.co';
const supabaseAnonKey ='sb_publishable_Twj42R7QuHV8v1t7mZxCVA_y9Ezz4zW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para testar a conexão com o Supabase
export const testarConexaoSupabase = async () => {
  try {
    // Tenta buscar apenas 1 registro leve para testar a comunicação
    const { data, error } = await supabase
      .from('alunos')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Erro na resposta do Supabase:', error.message);
      return { sucesso: false, erro: error.message };
    }

    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    return { sucesso: true, data };
  } catch (err) {
    console.error('❌ Erro de rede ou configuração:', err);
    return { sucesso: false, erro: err.message };
  }
};