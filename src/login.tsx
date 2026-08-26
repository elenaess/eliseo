import {
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  auth,
} from "./firebase";

import "./login.css";


type LoginProps = {
  onLogin?:
    () => void;
};


function EliseoLoginLogo() {
  return (
    <img
      src="/eliseo.png"
      alt="Elíseo"
      className="el-login-logo-image"
    />
  );
}


function Login({
  onLogin,
}: LoginProps) {
  const [
    email,
    setEmail,
  ] =
    useState("");


  const [
    password,
    setPassword,
  ] =
    useState("");


  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);


  const [
    mode,
    setMode,
  ] =
    useState<
      "login" | "register"
    >("login");


  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  function translateError(
    code: string
  ) {
    if (
      code.includes(
        "invalid-credential"
      )
    ) {
      return "E-mail ou senha incorretos.";
    }

    if (
      code.includes(
        "email-already-in-use"
      )
    ) {
      return "Este e-mail já possui uma conta.";
    }

    if (
      code.includes(
        "weak-password"
      )
    ) {
      return "Use uma senha com pelo menos 6 caracteres.";
    }

    if (
      code.includes(
        "invalid-email"
      )
    ) {
      return "Digite um e-mail válido.";
    }

    if (
      code.includes(
        "too-many-requests"
      )
    ) {
      return "Muitas tentativas. Tente novamente em alguns minutos.";
    }

    return "Não foi possível entrar no Elíseo.";
  }


  async function submit() {
    const cleanEmail =
      email.trim();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Preencha o e-mail e a senha."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      if (
        mode ===
        "register"
      ) {
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
      }

      onLogin?.();
    } catch (
      caught
    ) {
      const firebaseError =
        caught as {
          code?: string;
        };

      setError(
        translateError(
          firebaseError.code ||
            ""
        )
      );
    } finally {
      setLoading(false);
    }
  }


  async function resetPassword() {
    if (
      !email.trim()
    ) {
      setError(
        "Digite seu e-mail primeiro."
      );

      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setError(
        "Enviamos um link de recuperação para seu e-mail."
      );
    } catch {
      setError(
        "Não foi possível enviar a recuperação."
      );
    }
  }


  return (
    <main className="el-login-page">

      <div className="el-login-glow glow-left" />
      <div className="el-login-glow glow-right" />


      <section className="el-login-card">

        <div className="el-login-brand">

          <EliseoLoginLogo />

          <h1>
            Elíseo
          </h1>

          <p>
            Se integre ao espaço.
          </p>

        </div>


        <div className="el-login-fields">

          <label>
            E-mail
          </label>


          <div className="el-login-input">

            <Mail size={22} />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  submit();
                }
              }}
              placeholder="Digite seu e-mail"
              autoComplete="email"
            />

          </div>


          <label>
            Senha
          </label>


          <div className="el-login-input">

            <LockKeyhole
              size={22}
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  submit();
                }
              }}
              placeholder="Digite sua senha"
              autoComplete={
                mode ===
                "login"
                  ? "current-password"
                  : "new-password"
              }
            />


            <button
              className="el-login-eye"
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              {showPassword ? (
                <EyeOff
                  size={22}
                />
              ) : (
                <Eye
                  size={22}
                />
              )}
            </button>

          </div>


          {error && (
            <div className="el-login-error">
              {error}
            </div>
          )}


          <button
            className="el-login-submit"
            onClick={
              submit
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Entrando..."
              : mode ===
                  "login"
                ? "Entrar"
                : "Criar conta"}
          </button>


          {mode ===
            "login" && (

            <button
              className="el-login-forgot"
              type="button"
              onClick={
                resetPassword
              }
            >
              Esqueci minha senha
            </button>

          )}

        </div>


        <div className="el-login-divider">

          <i />

          <span>
            ou continue com
          </span>

          <i />

        </div>


        <div className="el-login-socials">

          <button
            className="google"
            title="Google — integração em breve"
          >
            G
          </button>


          <button
            className="discord"
            title="Discord — integração em breve"
          >
            <span>
              ◉
            </span>
          </button>


          <button
  className="github"
  title="GitHub — integração em breve"
>
  <span className="github-css-logo">
    GH
  </span>
</button>


          <button
            className="roblox"
            title="Roblox — integração em breve"
          >
            <i />
          </button>

        </div>


        <button
          className="el-login-switch"
          type="button"
          onClick={() => {
            setMode(
              mode ===
                "login"
                ? "register"
                : "login"
            );

            setError("");
          }}
        >
          {mode ===
          "login"
            ? "Não tem uma conta? Criar conta"
            : "Já possui uma conta? Entrar"}
        </button>

      </section>

    </main>
  );
}


export default Login;