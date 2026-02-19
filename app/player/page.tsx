"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  User,
  Upload,
  Save,
  FileImage,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
} from "lucide-react"
import PlayerQRCard from "@/components/player-qr-card"

interface PlayerProfile {
  id: number
  name: string
  jersey_number?: number
  position?: string
  photo_url?: string
  team_id?: number
  birth_date?: string
  phone?: string
  personal_email?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  blood_type?: string
  seasons_played?: number
  playing_since?: string
  medical_conditions?: string
  cedula_url?: string
  profile_completed?: boolean
  admin_verified?: boolean
  category_verified?: boolean
  teams?: {
    id: number
    name: string
    category: string
    logo_url?: string
  }
}

interface UserData {
  id: number
  username: string
  email: string
  role: string
}

export default function PlayerPortal() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCedula, setUploadingCedula] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cedulaInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    birth_date: "",
    phone: "",
    personal_email: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    blood_type: "",
    seasons_played: "",
    playing_since: "",
    medical_conditions: "",
  })

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.role !== "player") {
      router.push("/")
      return
    }

    setUser(userData)
    fetchPlayerProfile(userData.id, userData.email)
  }, [router])

  const fetchPlayerProfile = async (userId: number, userEmail?: string) => {
    try {
      const res = await fetch(`/api/player/profile?user_id=${userId}`)
      const data = await res.json()

      if (data.success && data.data) {
        setPlayer(data.data)
        setForm({
          birth_date: data.data.birth_date || "",
          phone: data.data.phone || "",
          personal_email: data.data.personal_email || userEmail || "",
          address: data.data.address || "",
          emergency_contact: data.data.emergency_contact || "",
          emergency_phone: data.data.emergency_phone || "",
          blood_type: data.data.blood_type || "",
          seasons_played: data.data.seasons_played?.toString() || "",
          playing_since: data.data.playing_since || "",
          medical_conditions: data.data.medical_conditions || "",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        return data.url
      } else {
        setMessage({ type: "error", text: data.message })
        return null
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al subir el archivo" })
      return null
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingPhoto(true)
    const url = await handleFileUpload(file, "player-photos")
    
    if (url) {
      // Actualizar inmediatamente en la UI
      setPlayer(prev => prev ? { ...prev, photo_url: url } : null)
      
      // Guardar en la base de datos
      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, photo_url: url }),
      })
      
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "Foto actualizada exitosamente" })
      }
    }
    setUploadingPhoto(false)
  }

  const handleCedulaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingCedula(true)
    const url = await handleFileUpload(file, "cedulas")
    
    if (url) {
      // Actualizar inmediatamente en la UI
      setPlayer(prev => prev ? { ...prev, cedula_url: url } : null)
      
      // Guardar en la base de datos
      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, cedula_url: url }),
      })
      
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "Cédula subida exitosamente" })
      }
    }
    setUploadingCedula(false)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/player/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          ...form,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setPlayer(data.data)
        setMessage({ type: "success", text: "Perfil guardado exitosamente" })
      } else {
        setMessage({ type: "error", text: data.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar el perfil" })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Perfil no encontrado</h2>
              <p className="text-muted-foreground mb-4">
                No se encontró un perfil de jugador asociado a tu cuenta.
              </p>
              <Button onClick={handleLogout} variant="outline">
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Portal del Jugador</h1>
              <p className="text-sm text-muted-foreground">Flag Durango</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Banner */}
        {!player.profile_completed && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-600">Completa tu perfil</h3>
              <p className="text-sm text-muted-foreground">
                Por favor completa tu información personal y sube tu cédula para que podamos verificar que estás en la categoría correcta.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-destructive/10 border border-destructive/20"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <p className={message.type === "success" ? "text-green-600" : "text-destructive"}>
              {message.text}
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Mi Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photo */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-primary/20">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-16 w-16 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{player.name}</h2>
                {player.jersey_number && (
                  <p className="text-2xl font-bold text-primary">#{player.jersey_number}</p>
                )}
              </div>

              {/* Team Info */}
              {player.teams && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Equipo</p>
                  <p className="font-medium">{player.teams.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {player.teams.category}
                  </Badge>
                </div>
              )}

              {/* Status */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Perfil completo</span>
                  {player.profile_completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verificado</span>
                  {player.admin_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <PlayerQRCard
            playerId={player.id}
            playerName={player.name}
            teamName={player.teams?.name}
            teamCategory={player.teams?.category}
            jerseyNumber={player.jersey_number}
            position={player.position}
            photoUrl={player.photo_url}
          />

          {/* Form Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Completa tu información para verificar tu categoría
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cedula Upload */}
              <div className="p-4 border-2 border-dashed rounded-lg">
                <Label className="flex items-center gap-2 mb-3">
                  <FileImage className="h-4 w-4" />
                  Cédula de Identidad (INE/IFE)
                </Label>
                <input
                  ref={cedulaInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleCedulaChange}
                  className="hidden"
                />
                {player.cedula_url ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm">Cédula subida</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cedulaInputRef.current?.click()}
                      disabled={uploadingCedula}
                    >
                      {uploadingCedula ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cambiar"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20"
                    onClick={() => cedulaInputRef.current?.click()}
                    disabled={uploadingCedula}
                  >
                    {uploadingCedula ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6" />
                        <span>Subir cédula</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>

              {/* Experience Section */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="seasons_played" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Temporadas jugadas
                  </Label>
                  <Input
                    id="seasons_played"
                    type="number"
                    min="0"
                    placeholder="Ej: 3"
                    value={form.seasons_played}
                    onChange={(e) => setForm({ ...form, seasons_played: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="playing_since" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Jugando desde (año)
                  </Label>
                  <Input
                    id="playing_since"
                    type="number"
                    min="1990"
                    max={new Date().getFullYear()}
                    placeholder="Ej: 2020"
                    value={form.playing_since}
                    onChange={(e) => setForm({ ...form, playing_since: e.target.value })}
                  />
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="birth_date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de nacimiento
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="blood_type" className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Tipo de sangre
                  </Label>
                  <Select
                    value={form.blood_type}
                    onValueChange={(value) => setForm({ ...form, blood_type: value })}
                  >
                    <SelectTrigger id="blood_type">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="618 123 4567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="personal_email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email personal (opcional)
                  </Label>
                  <Input
                    id="personal_email"
                    type="email"
                    placeholder="tu@email.com"
                    value={form.personal_email}
                    onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
                  />
                  {user?.email && !form.personal_email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Se usara tu email de cuenta: {user.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  placeholder="Calle, Colonia, Ciudad"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              {/* Emergency Contact */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Contacto de Emergencia
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="emergency_contact">Nombre</Label>
                    <Input
                      id="emergency_contact"
                      placeholder="Nombre del contacto"
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_phone">Teléfono</Label>
                    <Input
                      id="emergency_phone"
                      type="tel"
                      placeholder="618 123 4567"
                      value={form.emergency_phone}
                      onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Medical Conditions */}
              <div>
                <Label htmlFor="medical_conditions">Condiciones médicas (opcional)</Label>
                <Textarea
                  id="medical_conditions"
                  placeholder="Alergias, condiciones médicas relevantes..."
                  value={form.medical_conditions}
                  onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })}
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Información
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
