import { supabase } from '../supabase'; 

export async function cadastrarUsuario({ nome, email, senha, tipoUsuario, classe }) {
  try {
    // 1. Cadastra o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
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

    // 2. Insere os dados complementares na tabela personalizada 'users'
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