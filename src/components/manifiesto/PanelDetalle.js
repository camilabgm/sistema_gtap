"use client"

// Panel derecho: info de la escala (pulida de Escala/Aeronave/Post-Vuelo,
// sin re-cargar nada) + secciones editables de Pasajeros y Carga.

import { useState } from "react"
import { Pencil, Trash2, AlertTriangle } from "lucide-react"
import { Badge, formatearFechaCorta, formatearHoraCorta } from "./ListaEscalas"
import { construirCadenaRuta } from "@/lib/manifiesto"
import { exportarManifiestoPDF } from "@/lib/exportarManifiestoPDF"
import FormularioPasajero from "./FormularioPasajero"
import FormularioCarga from "./FormularioCarga"
import AccionIcono from "@/components/shared/AccionIcono"
import SeparadorSeccion from "@/components/shared/SeparadorSeccion"

export default function PanelDetalle({ detalle, puedeGestionar, onCambio }) {
  const [agregandoPasajero, setAgregandoPasajero] = useState(false)
  const [editandoPasajeroId, setEditandoPasajeroId] = useState(null)
  const [agregandoCarga, setAgregandoCarga] = useState(false)
  const [editandoCargaId, setEditandoCargaId] = useState(null)
  const [cerrando, setCerrando] = useState(false)

  const ruta = construirCadenaRuta(detalle.itinerarios)

  async function borrarPasajero(id) {
    if (!confirm("¿Borrar este pasajero del manifiesto?")) return
    const res = await fetch(`/api/manifiesto/pasajeros/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "No se pudo borrar el pasajero")
      return
    }
    onCambio()
  }

  async function borrarCarga(id) {
    if (!confirm("¿Borrar este ítem de carga?")) return
    const res = await fetch(`/api/manifiesto/cargas/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "No se pudo borrar la carga")
      return
    }
    onCambio()
  }

  async function cerrarManifiesto() {
    if (
      !confirm(
        "¿Cerrar el manifiesto de esta escala? Después de cerrarlo no vas a poder agregar ni editar pasajeros o carga — para corregir algo va a hacer falta un usuario de nivel superior."
      )
    ) {
      return
    }
    setCerrando(true)
    try {
      const res = await fetch(`/api/manifiesto/${detalle.id}/cerrar`, { method: "PUT" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "No se pudo cerrar el manifiesto")
        return
      }
      onCambio()
    } finally {
      setCerrando(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-5">
      {/* Encabezado: ruta, estado, fecha, horas */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{formatearFechaCorta(detalle.fecha)}</span>
            <Badge estado={detalle.estado} />
            {detalle.manifiesto_cerrado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Manifiesto cerrado
              </span>
            )}
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-900">
            {detalle.origen ?? "—"} → {detalle.destino ?? "—"}
          </div>
          <div className="text-xs text-gray-400">
            Escala #{detalle.id}{detalle.nro_orden ? ` · Orden #${detalle.nro_orden}` : ""}
          </div>
          {ruta && <div className="text-xs text-gray-400">{ruta}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{formatearHoraCorta(detalle.hora_salida)}</div>
          <div className="text-xs text-gray-500">
            salida · llegada {formatearHoraCorta(detalle.hora_llegada)}
            {detalle.hora_es_real ? " (real)" : " (estimada)"}
          </div>
        </div>
      </div>

      {/* Fila de datos: aeronave, tipo de misión, capacidad, ocupación */}
      <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 sm:grid-cols-4">
        <div>
          <div className="text-xs uppercase text-gray-400">Aeronave</div>
          <div className="text-sm font-medium text-gray-900">
            {detalle.aeronave ? `${detalle.aeronave.matricula} (${detalle.aeronave.tipo})` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Tipo de misión</div>
          <div className="text-sm font-medium text-gray-900">
            {detalle.tipo_mision ? `${detalle.tipo_mision.codigo} · ${detalle.tipo_mision.nombre}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Capacidad</div>
          <div className="text-sm font-medium text-gray-900">
            {detalle.pasajeros.length} / {detalle.capacidad ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Ocupación</div>
          <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${detalle.ocupacion_porcentaje ?? 0}%` }}
            />
          </div>
          <div className="mt-0.5 text-xs text-gray-500">{detalle.ocupacion_porcentaje ?? 0}%</div>
        </div>
      </div>

      {/* Si ya voló: horas y combustible reales, calcado de la planilla en papel */}
      {detalle.estado === "CUMPLIDA" && (
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-gray-400">Hs de vuelo</div>
            <div className="text-sm font-medium text-gray-900">{detalle.horas_vuelo ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Hs en tierra</div>
            <div className="text-sm font-medium text-gray-900">{detalle.horas_tierra ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Combustible</div>
            <div className="text-sm font-medium text-gray-900">
              {detalle.combustible_consumido ? `${detalle.combustible_consumido} L` : "—"}
              {detalle.tipo_combustible ? ` ${detalle.tipo_combustible}` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Tripulación — solo lectura, viene de Escalas */}
      <div className="border-b border-gray-100 pb-4">
        <div className="mb-2 text-xs uppercase text-gray-400">Tripulación</div>
        {detalle.tripulacion.length === 0 && <div className="text-sm text-gray-400">Sin tripulación asignada</div>}
        <ul className="space-y-1">
          {detalle.tripulacion.map((t) => (
            <li key={t.persona_id} className="text-sm text-gray-700">
              {t.persona.grado} {t.persona.nombre} {t.persona.apellido}
              <span className="ml-2 text-xs text-gray-400">
                {t.rol_en_vuelo === "PILOTO" ? "Piloto" : t.rol_en_vuelo === "COPILOTO" ? "Copiloto" : "Técnico de Vuelo"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botón exportar — visible siempre, reportes es ✓ para todos los roles */}
      <div className="flex justify-end">
        <button
          onClick={() => exportarManifiestoPDF(detalle)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Exportar PDF
        </button>
      </div>

      {/* A partir de acá: lo que el usuario tiene que completar */}
      <SeparadorSeccion texto="Manifiesto de esta escala" />

      {/* Manifiesto de pasajeros */}
      <div className="border-b border-gray-100 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Manifiesto · {detalle.pasajeros.length} persona{detalle.pasajeros.length === 1 ? "" : "s"}
          </div>
          {puedeGestionar && !agregandoPasajero && (
            <div className="flex gap-2">
              {!detalle.manifiesto_cerrado && (
                <button
                  onClick={cerrarManifiesto}
                  disabled={cerrando}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {cerrando ? "Cerrando…" : "Cerrar manifiesto"}
                </button>
              )}
              <button
                onClick={() => setAgregandoPasajero(true)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Agregar persona
              </button>
            </div>
          )}
        </div>

        {agregandoPasajero && (
          <FormularioPasajero
            escalaId={detalle.id}
            onCancelar={() => setAgregandoPasajero(false)}
            onGuardado={() => {
              setAgregandoPasajero(false)
              onCambio()
            }}
          />
        )}

        {detalle.pasajeros.length === 0 && !agregandoPasajero && (
          <div className="rounded-md border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            Sin personas asignadas. Agregá tripulación o pasajeros a esta escala.
          </div>
        )}

        <ul className="divide-y divide-gray-100">
          {detalle.pasajeros.map((p) =>
            editandoPasajeroId === p.id ? (
              <li key={p.id} className="py-2">
                <FormularioPasajero
                  escalaId={detalle.id}
                  pasajero={p}
                  onCancelar={() => setEditandoPasajeroId(null)}
                  onGuardado={() => {
                    setEditandoPasajeroId(null)
                    onCambio()
                  }}
                />
              </li>
            ) : (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{p.nombre} {p.apellido}</span>
                  <span className="ml-2 text-gray-500">{p.nro_documento} · {p.nacionalidad}</span>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-1">
                    <AccionIcono
                      icono={Pencil}
                      etiqueta="Editar pasajero"
                      onClick={() => setEditandoPasajeroId(p.id)}
                      color="primario"
                    />
                    <AccionIcono
                      icono={Trash2}
                      etiqueta="Borrar pasajero"
                      onClick={() => borrarPasajero(p.id)}
                      color="peligro"
                    />
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      </div>

      {/* Carga */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            Carga · {detalle.cargas.length} ítem{detalle.cargas.length === 1 ? "" : "s"}
          </div>
          {puedeGestionar && !agregandoCarga && (
            <button
              onClick={() => setAgregandoCarga(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Agregar carga
            </button>
          )}
        </div>

        {agregandoCarga && (
          <FormularioCarga
            escalaId={detalle.id}
            onCancelar={() => setAgregandoCarga(false)}
            onGuardado={() => {
              setAgregandoCarga(false)
              onCambio()
            }}
          />
        )}

        {detalle.cargas.length === 0 && !agregandoCarga && (
          <div className="text-sm text-gray-400">Sin carga registrada.</div>
        )}

        <ul className="divide-y divide-gray-100">
          {detalle.cargas.map((c) =>
            editandoCargaId === c.id ? (
              <li key={c.id} className="py-2">
                <FormularioCarga
                  escalaId={detalle.id}
                  carga={c}
                  onCancelar={() => setEditandoCargaId(null)}
                  onGuardado={() => {
                    setEditandoCargaId(null)
                    onCambio()
                  }}
                />
              </li>
            ) : (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{c.tipo}</span>
                  {c.descripcion && <span className="ml-2 text-gray-500">{c.descripcion}</span>}
                  {c.peso && <span className="ml-2 text-gray-500">{c.peso} kg</span>}
                </div>
                {puedeGestionar && (
                  <div className="flex gap-1">
                    <AccionIcono
                      icono={Pencil}
                      etiqueta="Editar carga"
                      onClick={() => setEditandoCargaId(c.id)}
                      color="primario"
                    />
                    <AccionIcono
                      icono={Trash2}
                      etiqueta="Borrar carga"
                      onClick={() => borrarCarga(c.id)}
                      color="peligro"
                    />
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  )
}