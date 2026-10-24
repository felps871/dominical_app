import { supabase } from '../supabase'; 
import { makeRedirectUri } from 'expo-auth-session';

// 1. Função de Cadastro de Usuário
export async function cadastrarUsuario({ nome, email, senha, tipoUsuario, classe }) {
  try {
    // Cria a URL de redirecionamento profunda (deep link) para a tua app
    const redirectTo = makeRedirectUri({
      scheme: 'dominicalapp',
      path: '(auth)/login', // Altera para a rota para onde queres mandá-lo após confirmar
    });

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { status: 'erro', campo: 'email', mensagem: 'Este e-mail já está cadastrado.' };
      }
      return { status: 'erro', mensagem: authError.message };
    }

    const user = authData.user;
    if (!user) {
      return { status: 'erro', mensagem: 'Não foi possível criar o usuário.' };
    }

    // Insere os dados complementares na tabela personalizada 'users'
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: user.id, // ID gerado pelo Auth do Supabase
        nome,
        email,
        tipo_usuario: tipoUsuario,
        classe: tipoUsuario === 'aluno' ? classe : null,
      },
    ]);

    if (profileError) {
      console.warn('Erro ao salvar perfil na tabela users:', profileError.message);
      return { status: 'erro', mensagem: 'Erro ao salvar os dados complementares do usuário.' };
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