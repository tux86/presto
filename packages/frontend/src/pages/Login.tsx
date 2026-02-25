import { useState } from "react";
import { ApiError } from "@/api/client";
import { LogoHorizontal } from "@/components/icons/LogoHorizontal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/i18n";
import { useAuthStore } from "@/stores/auth.store";
import { useConfigStore } from "@/stores/config.store";

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
  const isMobile = useIsMobile();
  const registrationEnabled = useConfigStore((s) => s.config?.registrationEnabled ?? true);

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
      if (err instanceof ApiError && err.status === 401) {
        setError(t("auth.invalidCredentials"));
      } else if (err instanceof ApiError && err.status === 409) {
        setError(t("auth.emailAlreadyRegistered"));
      } else if (err instanceof ApiError && err.status === 429) {
        setError(t("auth.tooManyAttempts"));
      } else {
        setError(t("auth.genericError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left branding panel — desktop only */}
      {!isMobile && (
        <div className="relative w-1/2 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating orbs */}
          <div className="animate-float absolute top-[15%] left-[20%] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="animate-float-delayed absolute bottom-[20%] right-[15%] h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="animate-float-slow absolute top-[55%] left-[55%] h-56 w-56 rounded-full bg-indigo-300/15 blur-3xl" />

          {/* Branding content */}
          <div className="relative z-10 flex flex-col items-center text-center px-12">
            <img src="/logo-horizontal-light.svg" alt="Presto" className="h-12 mb-8 brightness-0 invert" />
            <p className="text-2xl font-semibold text-white leading-snug whitespace-pre-line">{t("auth.tagline")}</p>
            <p className="mt-4 text-indigo-100/80 text-sm">{t("auth.brandingDescription")}</p>
          </div>
        </div>
      )}

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-page p-4">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          {isMobile && (
            <div className="flex justify-center mb-8">
              <LogoHorizontal className="h-12" />
            </div>
          )}

          <h2 className="text-lg font-semibold text-heading mb-1">
            {isRegister ? t("auth.register") : t("auth.login")}
          </h2>
          <p className="text-sm text-muted mb-6">{isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                optional
              />
            )}

            {error && <p className="text-sm text-error bg-error-subtle rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {isRegister ? t("auth.submitRegister") : t("auth.submitLogin")}
            </Button>
          </form>

          {registrationEnabled && (
            <p className="mt-4 text-center text-sm text-muted">
              {isRegister ? t("auth.hasAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
                className="text-accent-text hover:underline font-medium cursor-pointer"
              >
                {isRegister ? t("auth.switchToLogin") : t("auth.switchToRegister")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
