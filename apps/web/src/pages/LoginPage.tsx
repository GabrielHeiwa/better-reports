import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { setUser } = useAuth()

  async function handleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    try {
      const res = await fetch('http://localhost:3000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      })
      if (!res.ok) throw new Error('Falha na autenticação')
      const { user } = await res.json()
      setUser(user)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  return (
    <div className="dark h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl font-semibold">Better Reports</span>
        <span className="text-sm text-muted-foreground">Editor de relatórios PDF com IA</span>
      </div>

      <div className="flex flex-col items-center gap-4 p-8 border border-border rounded-xl bg-muted/20">
        <p className="text-sm text-muted-foreground">Entre com sua conta Google para continuar</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => alert('Erro ao autenticar com Google')}
          useOneTap
        />
      </div>
    </div>
  )
}
