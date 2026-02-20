import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useT } from "@/i18n";
import { useAuthStore } from "@/stores/auth.store";

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();
  const { t } = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register({ email, password, firstName, lastName, company: company || undefined });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-horizontal.png" alt="Presto" className="h-16" />
        </div>

        <div className="rounded-xl border border-edge bg-panel p-6">
          <h2 className="text-lg font-semibold text-heading mb-1">
            {isRegister ? t("auth.register") : t("auth.login")}
          </h2>
          <p className="text-sm text-muted mb-6">{isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("auth.firstName")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label={t("auth.lastName")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            )}

            <Input
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              required
            />

            <Input
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              required
            />

            {isRegister && (
              <Input
                label={t("auth.company")}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("auth.companyPlaceholder")}
              />
            )}

            {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              {isRegister ? t("auth.submitRegister") : t("auth.submitLogin")}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          {isRegister ? t("auth.hasAccount") : t("auth.noAccount")}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-accent-text hover:underline font-medium cursor-pointer"
          >
            {isRegister ? t("auth.switchToLogin") : t("auth.switchToRegister")}
          </button>
        </p>
      </div>
    </div>
  );
}
