"use client";

import {
  ArrowRight,
  Boxes,
  Database,
  Eye,
  EyeOff,
  Globe2,
  Network,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./Login.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiRequest } from "@/lib/api";



const backgrounds = [
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2400&q=90",
];


export default function Login() {

  const router = useRouter();

  const { refreshUser } = useAuth();


  const [activeBackground, setActiveBackground] =
    useState(0);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {

    const timer =
      window.setInterval(() => {

        setActiveBackground(
          current =>
            (current + 1) %
            backgrounds.length
        );

      }, 7000);


    return () =>
      window.clearInterval(timer);

  }, []);


  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();

      setError("");
      setLoading(true);


      try {

        const response =
          await apiRequest("/auth/login", {
            method: "POST",

            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          });


        const data =
          await response.json()
            .catch(() => ({}));


        if (!response.ok) {

          throw new Error(
            data?.message ||
            "Credenciales incorrectas."
          );

        }


        /*
         * =====================================================
         * 2FA
         * =====================================================
         */

        if (data.requiresTwoFactor) {

          sessionStorage.setItem(
            "pendingAuth",
            JSON.stringify({
              userId: data.userId,
              email: email.trim(),
            })
          );


          router.push("/2fa");

          return;
        }


        /*
         * =====================================================
         * AUTH SESSION SYNCHRONIZATION
         * =====================================================
         *
         * The backend has authenticated the user and created
         * the HttpOnly session cookie.
         *
         * Before navigating to a protected route we MUST
         * synchronize AuthProvider with /auth/me.
         *
         * This prevents ProtectedRoute from seeing
         * authenticated = false and redirecting back to /login.
         *
         * =====================================================
         */

        if (!data.user) {

          throw new Error(
            "El servidor autenticó la cuenta pero no devolvió el usuario."
          );

        }

        const authenticatedUser =
          await refreshUser();

        if (!authenticatedUser) {

          throw new Error(
            "La sesión fue creada, pero no pudo ser validada por /auth/me."
          );

        }


        /*
         * Recordarme
         *
         * We keep only the UI preference.
         * Authentication itself remains server-side.
         */

        if (rememberMe) {

          localStorage.setItem(
            "it_operations_hub_remember",
            "true"
          );

        } else {

          localStorage.removeItem(
            "it_operations_hub_remember"
          );

        }


        /*
         * Give the AuthProvider a moment to establish
         * the authenticated state from /auth/me.
         */

        router.replace("/dashboard");


      } catch (error) {

        setError(
          error instanceof Error
            ? error.message
            : "No fue posible iniciar sesión."
        );

      } finally {

        setLoading(false);

      }

    };


  return (

    <main className={styles.page}>

      <div className={styles.backgrounds}>

        {backgrounds.map(
          (image, index) => (

            <div
              key={image}
              className={`${styles.background} ${
                index === activeBackground
                  ? styles.active
                  : ""
              }`}
              style={{
                backgroundImage:
                  `url("${image}")`,
              }}
            />

          )
        )}

      </div>


      <div
        className={styles.globalOverlay}
      />


      <header
        className={styles.header}
      >

        <button
          type="button"
          className={styles.brand}
          onClick={() =>
            router.push("/")
          }
          aria-label="Volver al inicio"
        >

          <div className={styles.logo}>
            <Boxes
              size={25}
              strokeWidth={2.2}
            />
          </div>


          <div>

            <div
              className={styles.brandName}
            >
              Sistema Inventario
            </div>


            <div
              className={styles.brandSubtitle}
            >
              IT Operations Hub
            </div>

          </div>

        </button>


        <div
          className={styles.language}
        >

          <Globe2 size={15} />

          <span>ES</span>

          <span
            className={
              styles.languageChevron
            }
          >
            ˅
          </span>

        </div>

      </header>


      <section
        className={styles.content}
      >

        <div
          className={styles.presentation}
        >

          <div
            className={
              styles.presentationInner
            }
          >

            <div
              className={styles.eyebrow}
            >

              <Sparkles size={13} />

              SOLUCIÓN IT

              <span>•</span>

              SIMPLE

              <span>•</span>

              SEGURA

              <span>•</span>

              ESCALABLE

            </div>


            <h1>

              Todo tu inventario.

              <strong>
                Una sola operación.
              </strong>

            </h1>


            <p
              className={
                styles.presentationText
              }
            >
              Gestiona equipos, inventario,
              movimientos, reparaciones y
              toda tu infraestructura IT
              desde una sola plataforma
              centralizada. Mantén tus activos
              organizados, disponibles y bajo
              control.
            </p>


            <div
              className={styles.highlights}
            >

              <div
                className={styles.highlight}
              >

                <div
                  className={
                    styles.highlightIcon
                  }
                >
                  <Server size={19} />
                </div>


                <div>

                  <strong>
                    Control de activos
                  </strong>

                  <span>
                    Equipos y periféricos
                  </span>

                </div>

              </div>


              <div
                className={styles.highlight}
              >

                <div
                  className={
                    styles.highlightIcon
                  }
                >
                  <Database size={19} />
                </div>


                <div>

                  <strong>
                    Inventario en tiempo real
                  </strong>

                  <span>
                    Stock y disponibilidad
                  </span>

                </div>

              </div>


              <div
                className={styles.highlight}
              >

                <div
                  className={
                    styles.highlightIcon
                  }
                >
                  <Network size={19} />
                </div>


                <div>

                  <strong>
                    Trazabilidad
                  </strong>

                  <span>
                    Movimientos y asignaciones
                  </span>

                </div>

              </div>


              <div
                className={styles.highlight}
              >

                <div
                  className={
                    styles.highlightIcon
                  }
                >
                  <ShieldCheck size={19} />
                </div>


                <div>

                  <strong>
                    Operación segura
                  </strong>

                  <span>
                    Acceso controlado
                  </span>

                </div>

              </div>

            </div>


            <div
              className={
                styles.backgroundIndicator
              }
            >

              {backgrounds.map(
                (_, index) => (

                  <span
                    key={index}
                    className={
                      index ===
                      activeBackground
                        ? styles.indicatorActive
                        : ""
                    }
                  />

                )
              )}

            </div>

          </div>

        </div>


        <div
          className={styles.loginArea}
        >

          <section
            className={styles.card}
          >

            <div
              className={styles.cardHeader}
            >

              <div
                className={styles.cardIcon}
              >
                <ShieldCheck size={23} />
              </div>


              <div>

                <p
                  className={
                    styles.cardEyebrow
                  }
                >
                  ACCESO SEGURO
                </p>


                <h2>
                  Bienvenido de nuevo
                </h2>


                <p
                  className={
                    styles.cardDescription
                  }
                >
                  Accede al Sistema Inventario
                </p>

              </div>

            </div>


            <form
              className={styles.form}
              onSubmit={handleSubmit}
            >

              <label
                className={styles.field}
              >

                <span>
                  Correo o usuario
                </span>


                <input
                  type="email"
                  value={email}
                  onChange={event =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="tu@empresa.com"
                  autoComplete="username"
                  disabled={loading}
                  required
                />

              </label>


              <label
                className={styles.field}
              >

                <span>
                  Contraseña
                </span>


                <div
                  className={
                    styles.passwordWrapper
                  }
                >

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={event =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />


                  <button
                    type="button"
                    className={
                      styles.passwordToggle
                    }
                    onClick={() =>
                      setShowPassword(
                        current =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >

                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}

                  </button>

                </div>

              </label>


              {error && (

                <div
                  role="alert"
                  style={{
                    color: "#fca5a5",
                    fontSize: "12px",
                    marginTop: "-8px",
                  }}
                >
                  {error}
                </div>

              )}


              <div
                className={styles.options}
              >

                <label
                  className={styles.remember}
                >

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={event =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />


                  <span
                    className={
                      styles.checkbox
                    }
                  >
                    {rememberMe ? "✓" : ""}
                  </span>


                  <span>
                    Recordarme
                  </span>

                </label>


                <button
                  type="button"
                  className={styles.forgot}
                  onClick={() =>
                    setError(
                      "La recuperación de contraseña estará disponible próximamente."
                    )
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>

              </div>


              <button
                type="submit"
                className={styles.submit}
                disabled={loading}
              >

                <span>

                  {loading
                    ? "Verificando..."
                    : "Iniciar sesión"}

                </span>


                {!loading && (
                  <ArrowRight size={18} />
                )}

              </button>

            </form>


            <div
              className={styles.divider}
            >

              <span />

              <small>
                o continuar con
              </small>

              <span />

            </div>


            <button
              type="button"
              className={
                styles.microsoft
              }
              onClick={() =>
                setError(
                  "El inicio de sesión con Microsoft se conectará mediante Microsoft Entra ID."
                )
              }
            >

              <span
                className={
                  styles.microsoftLogo
                }
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
                <i />
              </span>


              <span>
                Iniciar sesión con Microsoft
              </span>


              <small>
                Próximamente
              </small>

            </button>


            <div
              className={styles.security}
            >

              <ShieldCheck size={15} />

              <span>
                Tu conexión está protegida
                mediante autenticación segura.
              </span>

            </div>

          </section>

        </div>

      </section>


      <footer
        className={styles.footer}
      >

        <div>

          <span
            className={
              styles.statusDot
            }
          />

          Sistema Inventario

        </div>


        <span>•</span>

        <span>
          IT Operations Hub
        </span>

        <span>•</span>

        <span>
          v1.0.0
        </span>

      </footer>

    </main>
  );
}



