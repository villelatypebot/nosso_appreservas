"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";
import type {
  ReservationWithDetails,
  ReservationStatus,
} from "@/lib/supabase/types";

type Tab = "reservas" | "disponibilidade";

export default function PainelPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const [supabase] = useState(() => createClient());

  const [tab, setTab] = useState<Tab>("reservas");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*, customers(name, phone), environments(name), units(name)")
      .eq("unit_id", unitId)
      .eq("reservation_date", date)
      .order("reservation_time");
    setReservations((data || []) as ReservationWithDetails[]);
    setLoading(false);
  }, [supabase, unitId, date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("painel-reservations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `unit_id=eq.${unitId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, unitId, load]);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setActionLoading(id);
    await fetch("/api/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setActionLoading(null);
  };

  const byStatus = (s: ReservationStatus) =>
    reservations.filter((r) => r.status === s);
  const totalPax = (list: ReservationWithDetails[]) =>
    list.reduce((a, r) => a + r.pax, 0);

  const counts = {
    confirmed: byStatus("confirmed").length,
    seated: byStatus("seated").length,
    pending: byStatus("pending").length,
    no_show: byStatus("no_show").length,
    cancelled: byStatus("cancelled").length,
  };
  const totalPaxToday = totalPax(
    reservations.filter((r) =>
      ["confirmed", "seated", "pending"].includes(r.status),
    ),
  );

  const StatusCard = ({
    label,
    count,
    color,
    bg,
    icon,
  }: {
    label: string;
    count: number;
    color: string;
    bg: string;
    icon: React.ReactNode;
  }) => (
    <div
      style={{
        background: "var(--brand-surface)",
        border: `1px solid ${color}25`,
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "var(--radius-md)",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {count}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginTop: "3px",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-page-shell wide">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-page-header"
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "4px",
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            Painel Operacional
          </h1>
          <p
            style={{
              color: "var(--brand-orange)",
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
            }}
          >
            Visão em tempo real
          </p>
        </div>
        <div className="admin-header-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              background: "var(--color-success-bg)",
              border: "1px solid rgba(76,175,125,0.25)",
              borderRadius: "99px",
              fontSize: "11px",
              color: "var(--color-success)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--color-success)",
              }}
            />
            Ao vivo
          </div>
          <input
            className="fh-input"
            type="date"
            style={{ width: "160px" }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="fh-btn fh-btn-ghost fh-btn-sm" onClick={load}>
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div
        className="admin-stat-grid"
      >
        <AnimatePresence>
          {[
            {
              label: "Confirmadas",
              count: counts.confirmed,
              color: "var(--color-success)",
              bg: "var(--color-success-bg)",
              icon: <CheckCircle size={20} color="var(--color-success)" />,
            },
            {
              label: "Sentados",
              count: counts.seated,
              color: "var(--color-info)",
              bg: "var(--color-info-bg)",
              icon: <Users size={20} color="var(--color-info)" />,
            },
            {
              label: "Pendentes",
              count: counts.pending,
              color: "var(--color-warning)",
              bg: "var(--color-warning-bg)",
              icon: <Clock size={20} color="var(--color-warning)" />,
            },
            {
              label: "No-show",
              count: counts.no_show,
              color: "var(--color-danger)",
              bg: "var(--color-danger-bg)",
              icon: <AlertCircle size={20} color="var(--color-danger)" />,
            },
            {
              label: "Total de pax",
              count: totalPaxToday,
              color: "var(--brand-orange)",
              bg: "rgba(244,121,32,0.1)",
              icon: <Users size={20} color="var(--brand-orange)" />,
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <StatusCard {...card} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div
        className="admin-tab-list"
        style={{ marginBottom: "20px" }}
      >
        {(
          [
            ["reservas", "Reservas"],
            ["disponibilidade", "Disponibilidade"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px",
              borderRadius: "7px",
              border: "none",
              background: tab === t ? "var(--brand-surface-2)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "13px",
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <Loader2
            size={24}
            style={{
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
              display: "block",
            }}
          />
        </div>
      ) : tab === "reservas" ? (
        <div className="fh-card admin-table-shell">
          {reservations.length === 0 ? (
            <div
              style={{
                padding: "48px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Nenhuma reserva para {formatDate(date)}
            </div>
          ) : (
            <>
              <table className="fh-table admin-table-desktop">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Cliente</th>
                    <th>Pax</th>
                    <th>Ambiente</th>
                    <th>Status</th>
                    <th>Ações rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r, i) => {
                    const customer = r.customers as
                      | { name: string; phone: string }
                      | undefined;
                    const env = r.environments as
                      | { name: string }
                      | null
                      | undefined;
                    const isLoading = actionLoading === r.id;
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <td
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "var(--brand-orange-light)",
                          }}
                        >
                          {String(r.reservation_time).substring(0, 5)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#fff" }}>
                            {customer?.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.5)",
                            }}
                          >
                            {customer?.phone}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--brand-orange)",
                              fontFamily: "monospace",
                              marginTop: "2px",
                            }}
                          >
                            {r.confirmation_code}
                          </div>
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            fontSize: "16px",
                            textAlign: "center",
                            color: "#fff",
                          }}
                        >
                          {r.pax}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {env?.name || "—"}
                        </td>
                        <td>
                          <span
                            className={`fh-badge ${statusBadgeClass(r.status)}`}
                          >
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {r.status === "pending" && (
                              <button
                                className="fh-btn fh-btn-sm fh-btn-outline"
                                disabled={isLoading}
                                onClick={() => updateStatus(r.id, "confirmed")}
                              >
                                Confirmar
                              </button>
                            )}
                            {(r.status === "pending" ||
                              r.status === "confirmed") && (
                                <button
                                  className="fh-btn fh-btn-sm"
                                  disabled={isLoading}
                                  onClick={() => updateStatus(r.id, "seated")}
                                  style={{
                                    background: "var(--color-info-bg)",
                                    color: "var(--color-info)",
                                    border: "1px solid rgba(91,141,239,0.25)",
                                    fontSize: "12px",
                                    padding: "5px 10px",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Users size={12} /> Sentar
                                </button>
                              )}
                            {r.status === "confirmed" && (
                              <button
                                className="fh-btn fh-btn-sm fh-btn-danger"
                                disabled={isLoading}
                                onClick={() => updateStatus(r.id, "no_show")}
                              >
                                <XCircle size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="admin-table-mobile">
                {reservations.map((r) => {
                  const customer = r.customers as
                    | { name: string; phone: string }
                    | undefined;
                  const env = r.environments as
                    | { name: string }
                    | null
                    | undefined;
                  const isLoading = actionLoading === r.id;
                  return (
                    <div key={r.id} className="admin-mobile-card">
                      <div className="admin-mobile-card-head">
                        <div>
                          <div className="admin-mobile-card-title">
                            {customer?.name || "Cliente"}
                          </div>
                          <div className="admin-mobile-card-subtitle">
                            {r.confirmation_code}
                          </div>
                        </div>
                        <span className={`fh-badge ${statusBadgeClass(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <div className="admin-mobile-card-grid">
                        <div className="admin-mobile-field">
                          <span className="admin-mobile-label">Horário</span>
                          <div className="admin-mobile-value">
                            {String(r.reservation_time).substring(0, 5)}
                          </div>
                        </div>
                        <div className="admin-mobile-field">
                          <span className="admin-mobile-label">Pax</span>
                          <div className="admin-mobile-value">{r.pax}</div>
                        </div>
                        <div className="admin-mobile-field">
                          <span className="admin-mobile-label">Telefone</span>
                          <div className="admin-mobile-value">
                            {customer?.phone || "—"}
                          </div>
                        </div>
                        <div className="admin-mobile-field">
                          <span className="admin-mobile-label">Ambiente</span>
                          <div className="admin-mobile-value">{env?.name || "—"}</div>
                        </div>
                      </div>
                      <div className="admin-mobile-card-actions">
                        {r.status === "pending" && (
                          <button
                            className="fh-btn fh-btn-sm fh-btn-outline"
                            disabled={isLoading}
                            onClick={() => updateStatus(r.id, "confirmed")}
                          >
                            Confirmar
                          </button>
                        )}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <button
                            className="fh-btn fh-btn-sm"
                            disabled={isLoading}
                            onClick={() => updateStatus(r.id, "seated")}
                            style={{
                              background: "var(--color-info-bg)",
                              color: "var(--color-info)",
                              border: "1px solid rgba(91,141,239,0.25)",
                              fontSize: "12px",
                              padding: "5px 10px",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                            }}
                          >
                            <Users size={12} /> Sentar
                          </button>
                        )}
                        {r.status === "confirmed" && (
                          <button
                            className="fh-btn fh-btn-sm fh-btn-danger"
                            disabled={isLoading}
                            onClick={() => updateStatus(r.id, "no_show")}
                          >
                            <XCircle size={12} /> No-show
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Disponibilidade view */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "10px",
          }}
        >
          {[
            "18:00",
            "18:30",
            "19:00",
            "19:30",
            "20:00",
            "20:30",
            "21:00",
            "21:30",
          ].map((slot) => {
            const booked = reservations.filter(
              (r) =>
                String(r.reservation_time).substring(0, 5) === slot &&
                ["confirmed", "seated", "pending"].includes(r.status),
            );
            const pax = totalPax(booked);
            const pct = Math.min(100, (pax / 60) * 100);
            const color =
              pct >= 90
                ? "var(--color-danger)"
                : pct >= 70
                  ? "var(--color-warning)"
                  : "var(--color-success)";
            return (
              <div
                key={slot}
                style={{
                  background: "var(--brand-surface)",
                  border: "1px solid var(--brand-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--brand-gold)",
                    marginBottom: "6px",
                  }}
                >
                  {slot}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color,
                  }}
                >
                  {pax}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    marginBottom: "10px",
                  }}
                >
                  / 60 pax
                </div>
                <div
                  style={{
                    height: "4px",
                    background: "var(--brand-surface-3)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      borderRadius: "99px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  {booked.length} reservas
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
