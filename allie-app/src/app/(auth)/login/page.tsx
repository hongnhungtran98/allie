import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-lavender-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🌸</span>
          <h1 className="mt-3 text-2xl font-bold text-ink">Allie</h1>
          <p className="mt-1 text-sm text-ink-soft">Your personal assistant</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
