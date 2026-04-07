import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mail, Lock, ArrowRight, Sparkles, Home } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const requestedNext = searchParams.get('next');
  const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';
  const redirectUrl = `${window.location.origin}${nextPath}`;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUrl,
    });
    if (error) setError(error.message || '구글 로그인에 실패했습니다.');
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate(nextPath, { replace: true });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) setError(error.message);
      else setMessage('가입 요청이 완료되었습니다. 이메일 인증이 켜져 있다면 받은 메일함을 확인해주세요.');
    }
    setLoading(false);
  };

  if (user) {
    return (
      <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">이미 로그인되어 있습니다</h1>
          <p className="mt-2 text-sm text-slate-500">{user.email}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="h-11 rounded-xl" onClick={() => navigate(nextPath, { replace: true })}>
              계속하기
            </Button>
            <Button
              className="h-11 rounded-xl"
              onClick={() => void signOut()}
              variant="outline"
            >
              다른 계정으로 로그인
            </Button>
            <Link className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900" to="/">
              <Home className="w-4 h-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg bg-slate-950">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-black text-slate-950 tracking-tight">
            Personai 계정
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            지금은 선택형 로그인입니다. 기존 기능은 로그인 없이도 사용할 수 있어요.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-900/5">
          <h2 className="font-display text-lg font-black text-slate-950 mb-2 text-center">
            {isLogin ? '로그인' : '회원가입'}
          </h2>
          <p className="mb-6 text-center text-xs leading-5 text-slate-500">
            관리자 페이지와 나중의 토큰/결제 기능을 위한 계정 기반입니다.
          </p>

          {/* Google */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-12 text-sm font-medium gap-3 rounded-xl border-slate-200 hover:bg-slate-50 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-slate-400">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            {message && <p className="text-sm text-primary text-center">{message}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-sm gap-2 bg-slate-950 hover:bg-slate-800"
            >
              {isLogin ? '로그인' : '가입하기'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
              className="text-slate-950 font-bold ml-1 hover:underline"
            >
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
          <div className="mt-5 text-center">
            <Link className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700" to="/">
              <Home className="w-3.5 h-3.5" />
              사이트로 돌아가기
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-slate-500">
          <Sparkles className="w-3 h-3" />
          <span>로그인해도 프리미엄 자문은 아직 자동으로 잠기지 않습니다</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
