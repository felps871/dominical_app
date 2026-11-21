import { supabase } from '../supabase';
import { makeRedirectUri } from 'expo-auth-session';

// 1. Função avançada para verificar o aluno na base antes de cadastrar
export async function verificarAlunoPorNome(nomeCompleto) {
  try {
    const nomeLimpo = nomeCompleto.trim();
    if (!nomeLimpo) {
      return { status: 'erro', campo: 'nome', mensagem: 'O nome não pode estar vazio.' };
    }

    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .ilike('nome', nomeLimpo)
      .maybeSingle();

    if (error) {
      console.error('Erro no Supabase ao buscar aluno:', error.message);
      return { 
        status: 'erro', 
        campo: 'nome', 
        mensagem: 'Erro de comunicação com o banco de dados. Verifique sua internet.' 
      };
    }

    if (!data) {
      return { 
        status: 'erro', 
        campo: 'nome', 
        mensagem: 'Nome não encontrado na lista oficial de alunos. Verifique se digitou corretamente ou procure a secretaria.' 
      };
    }

    return { status: 'sucesso', aluno: data };
  } catch (err) {
    console.error('Erro crítico na verificação de aluno:', err);
    return { status: 'erro', campo: 'nome', mensagem: 'Ocorreu um erro inesperado ao validar o aluno.' };
  }
}

// 2. Função de Cadastro Avançada com tratamento detalhado de erros
export async function cadastrarUsuario({ nome, email, senha, tipoUsuario, classe, alunoId }) {
  try {
    const redirectTo = makeRedirectUri({
      scheme: 'dominicalapp',
      path: '(auth)/login',
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
          aluno_id: alunoId || null,
        },
      },
    });

    if (authError) {
      const msgErro = authError.message.toLowerCase();

      if (msgErro.includes('already registered') || msgErro.includes('user already registered')) {
        return { status: 'erro', campo: 'email', mensagem: 'Este e-mail já está cadastrado no sistema.' };
      }
      if (msgErro.includes('password should be')) {
        return { status: 'erro', campo: 'senha', mensagem: 'A senha é muito fraca. Escolha uma senha mais segura.' };
      }
      if (msgErro.includes('invalid email')) {
        return { status: 'erro', campo: 'email', mensagem: 'O formato do e-mail é inválido.' };
      }

      return { status: 'erro', mensagem: authError.message };
    }

    const user = authData.user;
    if (!user) {
      return { status: 'erro', mensagem: 'Não foi possível inicializar a criação da conta.' };
    }

    if (user.identities && user.identities.length === 0) {
      return { status: 'erro', campo: 'email', mensagem: 'Este e-mail já possui uma conta associada.' };
    }

    return {
      status: 'sucesso',
      usuario: { email: user.email },
    };
  } catch (error) {
    console.error('Erro crítico no serviço de cadastro:', error);
    return { status: 'erro', mensagem: 'Erro crítico de conexão. Verifique sua rede e tente novamente.' };
  }
}

// 3. Função de Autenticação/Login (Mantida exatamente como estava funcionando)
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