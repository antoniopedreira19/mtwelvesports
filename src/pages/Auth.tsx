import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
const LOGO_URL = 'https://ychhgfsavlnoyjvfpdxa.supabase.co/storage/v1/object/public/logos&templates/image-removebg-preview%20(2).png';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error, data } = await signIn(email, password);
    
    if (error) {
      setLoading(false);
      toast({ 
        title: 'Erro ao entrar', 
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive' 
      });
    } else {
      // Check user role to redirect accordingly
      const userId = data?.user?.id;
      if (userId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        
        setLoading(false);
        if (roleData?.role === 'client') {
          navigate('/athlete-portal');
        } else {
          navigate('/');
        }
      } else {
        setLoading(false);
        navigate('/');
      }
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          {/* Logo inside card */}
          <div className="flex flex-col items-center mb-6">
            <img 
              src={LOGO_URL} 
              alt="MTwelve Sports" 
              className="w-32 h-auto object-contain mb-3"
            />
            <p className="text-muted-foreground text-sm tracking-wide">
              Gerencie seus atletas e contratos
            </p>
          </div>

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
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-6">
          © 2026 MTwelve Sports. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
