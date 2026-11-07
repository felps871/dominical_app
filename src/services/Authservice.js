import { supabase } from '../supabase';
import { makeRedirectUri } from 'expo-auth-session';
 
// 1. Função de Cadastro de Usuário
// O perfil em public.users é criado pela trigger handle_new_user (no Supabase),
// usando os dados enviados em options.data. Não fazemos insert manual aqui.
export async function cadastrarUsuario({ nome, email, senha, tipoUsuario, classe }) {
  try {
    // Deep link para onde o usuário volta após confirmar o e-mail
    const redirectTo = makeRedirectUri({
      scheme: 'dominicalapp',
      path: '(auth)/login', // Ajuste se a sua tela de login estiver em outra rota
    });
 
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          nome,
          tipo_usuario: tipoUsuario,
          classe: tipoUsuario === 'aluno' ? classe : null,
        },
      },
    });
 
    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        return { status: 'erro', campo: 'email', mensagem: 'Este e-mail já está cadastrado.' };
      }
      return { status: 'erro', mensagem: authError.message };
    }
 
    const user = authData.user;
    if (!user) {
      return { status: 'erro', mensagem: 'Não foi possível criar o usuário.' };
    }
 
    // Com confirmação de e-mail ativa, um e-mail já existente não gera erro:
    // o Supabase devolve um usuário "falso" sem identidades.
    if (user.identities && user.identities.length === 0) {
      return { status: 'erro', campo: 'email', mensagem: 'Este e-mail já está cadastrado.' };
    }
 
    return {
      status: 'sucesso',
      usuario: { email: user.email },
    };
  } catch (error) {
    console.error('Erro inesperado no cadastro:', error);
    return { status: 'erro', mensagem: 'Erro de conexão. Tente novamente.' };
  }
}
 
// 2. Função de Autenticação/Login
export async function autenticarUsuario({ email, senha }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
 
    if (authError) {
      return { status: 'erro', mensagem: 'E-mail ou senha incorretos.' };
    }
 
    const userId = authData.user.id;
 
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
 
    if (profileError || !profile) {
      return { status: 'erro', mensagem: 'Perfil do usuário não encontrado na base de dados.' };
    }
 
    return {
      status: 'sucesso',
      usuario: {
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        tipoUsuario: profile.tipo_usuario,
        classe: profile.classe,
      },
    };
  } catch (error) {
    console.error('Erro inesperado no login:', error);
    return { status: 'erro', mensagem: 'Erro de conexão. Tente novamente.' };
  }
}
 