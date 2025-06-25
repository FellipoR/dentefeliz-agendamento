
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  onLogin: (user: any) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isAdmin) {
        // Admin login
        if (formData.username === 'admin' && formData.password === 'admin123') {
          const adminUser = {
            username: 'admin',
            type: 'admin'
          };
          localStorage.setItem('currentUser', JSON.stringify(adminUser));
          onLogin(adminUser);
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo, administrador!"
          });
        } else {
          toast({
            title: "Erro no login",
            description: "Credenciais administrativas inválidas",
            variant: "destructive"
          });
        }
      } else {
        if (isLogin) {
          // Client login
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const user = users.find((u: any) => 
            u.email === formData.email && u.password === formData.password
          );
          
          if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            onLogin(user);
            toast({
              title: "Login realizado com sucesso!",
              description: `Bem-vindo, ${user.name}!`
            });
          } else {
            toast({
              title: "Erro no login",
              description: "Email ou senha incorretos",
              variant: "destructive"
            });
          }
        } else {
          // Client registration
          if (!formData.name || !formData.email || !formData.phone || !formData.password) {
            toast({
              title: "Erro no cadastro",
              description: "Por favor, preencha todos os campos",
              variant: "destructive"
            });
            return;
          }

          const users = JSON.parse(localStorage.getItem('users') || '[]');
          const existingUser = users.find((u: any) => u.email === formData.email);
          
          if (existingUser) {
            toast({
              title: "Erro no cadastro",
              description: "Email já cadastrado",
              variant: "destructive"
            });
            return;
          }

          const newUser = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            type: 'client'
          };

          users.push(newUser);
          localStorage.setItem('users', JSON.stringify(users));
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          onLogin(newUser);
          
          toast({
            title: "Cadastro realizado com sucesso!",
            description: `Bem-vindo, ${newUser.name}!`
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            🦷 Dente Feliz
          </CardTitle>
          <p className="text-muted-foreground">
            {isAdmin ? 'Acesso Administrativo' : (isLogin ? 'Fazer Login' : 'Criar Conta')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Button
              variant={!isAdmin ? "default" : "outline"}
              onClick={() => setIsAdmin(false)}
              className="flex-1"
            >
              Cliente
            </Button>
            <Button
              variant={isAdmin ? "default" : "outline"}
              onClick={() => setIsAdmin(true)}
              className="flex-1"
            >
              Admin
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin ? (
              <>
                <div>
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="admin"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="admin123"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                {!isLogin && (
                  <>
                    <div>
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required={!isLogin}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Carregando...' : 
               isAdmin ? 'Entrar como Admin' : 
               (isLogin ? 'Entrar' : 'Cadastrar')}
            </Button>

            {!isAdmin && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm"
                >
                  {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
