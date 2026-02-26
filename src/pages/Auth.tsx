import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import mtwelveLogo from '@/assets/mtwelve-logo.png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ 
        title: 'Erro ao entrar', 
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive' 
      });
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'Erro', description: 'Este email já está cadastrado', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ 
        title: 'Cadastro realizado!', 
        description: 'Verifique seu email para confirmar a conta ou faça login diretamente.' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo & Branding */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={mtwelveLogo} 
            alt="MTwelve Sports" 
            className="w-28 h-28 object-contain mb-4 drop-shadow-lg"
          />
          <p className="text-muted-foreground text-sm tracking-wide">
            Gerencie seus atletas e contratos
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12 bg-background/80 border-border/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground font-medium">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 bg-background/80 border-border/50 focus:border-primary transition-colors"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold gold-gradient hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-foreground font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12 bg-background/80 border-border/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-foreground font-medium">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 bg-background/80 border-border/50 focus:border-primary transition-colors"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold gold-gradient hover:opacity-90 transition-opacity" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Cadastrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          © 2026 MTwelve Sports. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
