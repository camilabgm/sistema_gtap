{/* Derivar / Ya volví — acción general, no por escala */}
<div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
  {cargandoDerivacion ? (
    <p className="text-sm text-gray-400">Cargando estado de derivación...</p>
  ) : derivacion ? (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">
          Derivaste tu autorización desde las {formatearFechaHora(derivacion.desde)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Motivo: {ETIQUETAS_MOTIVO_DERIVACION[derivacion.motivo] || derivacion.motivo}
          {derivacion.motivo_detalle && ` — ${derivacion.motivo_detalle}`}
        </p>
      </div>
      <button
        onClick={handleYaVolvi}
        disabled={enviandoDerivar}
        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {enviandoDerivar ? "..." : "Ya volví"}
      </button>
    </div>
  ) : mostrarFormDerivar ? (
    <div className="space-y-3">
      {errorDerivar && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{errorDerivar}</div>
      )}
      <div className="flex gap-2">
        <select
          value={motivoDerivar}
          onChange={(e) => setMotivoDerivar(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(ETIQUETAS_MOTIVO_DERIVACION).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {motivoDerivar === "OTRO" && (
          <input
            type="text"
            value={detalleDerivar}
            onChange={(e) => setDetalleDerivar(e.target.value)}
            placeholder="Detalle del motivo"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDerivar}
          disabled={enviandoDerivar}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {enviandoDerivar ? "Guardando..." : "Confirmar derivación"}
        </button>
        <button
          onClick={() => { setMostrarFormDerivar(false); setErrorDerivar(null) }}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">¿No podés autorizar hoy?</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Vas a derivar tu autorización al siguiente cargo hasta que vuelvas.
        </p>
      </div>
      <button
        onClick={() => setMostrarFormDerivar(true)}
        className="bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium px-4 py-2 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-2 shrink-0"
      >
        <span>⏸</span> Derivar autorización
      </button>
    </div>
  )}
</div>