"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"

export default function CerrarSesionAutomatico() {
  useEffect(() => {
    signOut({ callbackUrl: "/login" })
  }, [])

  return null
}