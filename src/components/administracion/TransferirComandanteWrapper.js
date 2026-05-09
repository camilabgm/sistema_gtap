"use client"

import { useState } from "react"
import TransferirComandanteModal from "./TransferirComandanteModal"

export default function TransferirComandanteWrapper() {
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <>
      <button
        onClick={() => setModalAbierto(true)}
        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
      >
        Transferir cargo de Comandante
      </button>

      {modalAbierto && (
        <TransferirComandanteModal onCerrar={() => setModalAbierto(false)} />
      )}
    </>
  )
}