import {
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type AuthProvider,
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
      src={`${import.meta.env.BASE_URL}eliseo.png`}
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


  const [
    info,
    setInfo,
  ] =
    useState("");


  const [
    unverifiedEmail,
    setUnverifiedEmail,
  ] =
    useState(false);


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
        "popup-closed-by-user"
      )
    ) {
      return "A janela de login foi fechada antes de concluir.";
    }

    if (
      code.includes(
        "popup-blocked"
      )
    ) {
      return "O navegador bloqueou a janela de login.";
    }

    if (
      code.includes(
        "account-exists-with-different-credential"
      )
    ) {
      return "Este e-mail já usa outro método de login.";
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
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Preencha o e-mail e a senha."
      );

      setInfo("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");
      setUnverifiedEmail(false);

      /* =====================================================
         CADASTRO

         A verificação é enviada UMA VEZ aqui, logo após
         a criação da conta.
         ===================================================== */

      if (
        mode ===
        "register"
      ) {
        const credential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        await sendEmailVerification(
          credential.user
        );

        await signOut(
          auth
        );

        setMode(
          "login"
        );

        setPassword(
          ""
        );

        setInfo(
          "Conta criada. Confirme seu e-mail pelo link enviado pelo Firebase e depois entre normalmente."
        );

        return;
      }


      /* =====================================================
         LOGIN

         Aqui NÃO enviamos outro e-mail.
         Só verificamos o status salvo pelo Firebase.

         Se emailVerified === true, entra direto.
         ===================================================== */

      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      await credential.user.reload();

      const currentUser =
        auth.currentUser;

      if (
        !currentUser
      ) {
        throw new Error(
          "Não foi possível carregar sua conta."
        );
      }

      if (
        !currentUser.emailVerified
      ) {
        await signOut(
          auth
        );

        setUnverifiedEmail(
          true
        );

        setInfo(
          "Seu e-mail ainda não foi confirmado. Abra o link que o Firebase enviou e depois clique em Entrar novamente."
        );

        return;
      }

      // Já confirmou uma vez?
      // Entra direto daqui em diante.
      onLogin?.();
    } catch (
      caught
    ) {
      if (
        caught instanceof Error &&
        !("code" in caught)
      ) {
        setError(
          caught.message
        );
        return;
      }

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


  /* =========================================================
     REENVIO MANUAL

     Só aparece se a pessoa tentou entrar e ainda não confirmou.
     Não acontece automaticamente em todos os logins.
     ========================================================= */

  async function resendVerification() {
    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Digite seu e-mail e senha para reenviar a confirmação."
      );

      setInfo("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");

      const credential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      await credential.user.reload();

      if (
        credential.user.emailVerified
      ) {
        await signOut(
          auth
        );

        setUnverifiedEmail(
          false
        );

        setInfo(
          "Seu e-mail já está confirmado. Clique em Entrar."
        );

        return;
      }

      await sendEmailVerification(
        credential.user
      );

      await signOut(
        auth
      );

      setInfo(
        "Enviamos um novo link de confirmação para seu e-mail."
      );
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


  async function socialLogin(
    provider:
      AuthProvider
  ) {
    try {
      setLoading(true);
      setError("");
      setInfo("");
      setUnverifiedEmail(false);

      await signInWithPopup(
        auth,
        provider
      );

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


  async function googleLogin() {
    const provider =
      new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt:
        "select_account",
    });

    await socialLogin(
      provider
    );
  }


  async function githubLogin() {
    const provider =
      new GithubAuthProvider();

    provider.addScope(
      "user:email"
    );

    await socialLogin(
      provider
    );
  }


  async function resetPassword() {
    if (
      !email.trim()
    ) {
      setError(
        "Digite seu e-mail primeiro."
      );

      setInfo("");
      return;
    }

    try {
      setError("");
      setInfo("");

      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setInfo(
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


          {info && (
            <div
              className="el-login-error"
              style={{
                background:
                  "rgba(31, 82, 110, 0.35)",
                borderColor:
                  "rgba(84, 180, 230, 0.2)",
                color:
                  "#a9dcff",
              }}
            >
              {info}
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
              ? "Aguarde..."
              : mode ===
                  "login"
                ? "Entrar"
                : "Criar conta"}
          </button>


          {mode ===
            "login" && (
            <>
              {unverifiedEmail && (
                <button
                  className="el-login-forgot"
                  type="button"
                  onClick={
                    resendVerification
                  }
                  disabled={
                    loading
                  }
                >
                  Reenviar confirmação de e-mail
                </button>
              )}

              <button
                className="el-login-forgot"
                type="button"
                onClick={
                  resetPassword
                }
              >
                Esqueci minha senha
              </button>
            </>
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
            title="Continuar com Google"
            type="button"
            onClick={
              googleLogin
            }
            disabled={
              loading
            }
          >
            <img
              src={`${import.meta.env.BASE_URL}google.svg`}
              alt=""
              aria-hidden="true"
              className="el-login-social-logo google-logo"
            />
          </button>


          <button
            className="github"
            title="Continuar com GitHub"
            type="button"
            onClick={
              githubLogin
            }
            disabled={
              loading
            }
          >
            <img
              src={`${import.meta.env.BASE_URL}github.svg`}
              alt=""
              aria-hidden="true"
              className="el-login-social-logo github-logo"
            />
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

            setError(
              ""
            );

            setInfo(
              ""
            );

            setUnverifiedEmail(
              false
            );
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
