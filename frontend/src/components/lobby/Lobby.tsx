"use client";

import { ArrowRight, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./Lobby.module.css";

export default function Lobby() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <div className={styles.background} />
      <div className={styles.overlay} />

      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => router.push("/")}
        >
          <div className={styles.logo}>
            IT
          </div>

          <div className={styles.brandText}>
            <div className={styles.brandName}>
              IT Operations Hub
            </div>

            <div className={styles.brandSubtitle}>
              Sistema Inventario
            </div>
          </div>
        </button>

        <div className={styles.headerRight}>
          <div className={styles.status}>
            <span className={styles.statusDot} />
            Sistema operativo
          </div>

          <div className={styles.language}>
            <Globe2 size={15} />
            ES
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.content}>
          <div className={styles.eyebrow}>
            <Sparkles size={15} />
            IT OPERATIONS
          </div>

          <h1 className={styles.title}>
            Todo tu ecosistema IT.
            <span className={styles.titleAccent}>
              En un solo lugar.
            </span>
          </h1>

          <p className={styles.description}>
            Administra equipos, inventario, movimientos,
            posiciones, reparaciones y operaciones de IT
            desde una plataforma centralizada.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => router.push("/login")}
            >
              <span>Iniciar sesión</span>
              <ArrowRight size={18} />
            </button>

            <div className={styles.secure}>
              <ShieldCheck size={17} />
              Acceso seguro
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>IT OPERATIONS HUB</span>
        <span className={styles.separator}>•</span>
        <span>Enterprise Asset Management</span>

        <span className={styles.footerRight}>
          v1.0
        </span>
      </footer>
    </main>
  );
}