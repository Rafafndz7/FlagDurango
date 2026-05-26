"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Target, Star, CheckCircle, Shield, Loader2, Save, User, Award, Medal } from "lucide-react"
import { supabase } from "@/lib/supabase" // Usaremos supabase directo para MVPs y Asistencia igual que en la app

interface Game {
  id: number
  home_team: string
  away_team: string
  game_date: string
  status: string
  category?: string
  jornada?: number
}

interface Team {
  id: number
  name: string
  category?: string
}

interface Player {
  id: number
  name: string
  jersey_number: number
  position?: string
  team_id: number
  photo_url?: string
}

interface TeamQuickManagerProps {
  games: Game[]
  teams: Team[]
  players: Player[]
}

export default function TeamQuickManager({ games, teams, players }: TeamQuickManagerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Estado unificado para cada jugador
  const [records, setRecords] = useState<Record<number, {
    attended: boolean;
    touchdowns_totales: number;
    pases_completos: number;
    intercepciones: number;
    sacks: number;
    isGameMVP: boolean;
    isWeeklyMVP: boolean;
  }>>({})

  const selectedTeam = teams.find(t => t.id === selectedTeamId)
  
  // Filtrar partidos donde juega el equipo seleccionado
  const teamGames = games.filter(g => 
    selectedTeam && (g.home_team === selectedTeam.name || g.away_team === selectedTeam.name)
  ).sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())

  const selectedGame = games.find(g => g.id === selectedGameId)
  
  // Filtrar jugadores del equipo
  const teamPlayers = players.filter(p => p.team_id === selectedTeamId)

  // Cargar datos previos cuando se selecciona un partido
  useEffect(() => {
    if (!selectedGameId || !selectedTeamId) {
      setRecords({})
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const defaultRecords: any = {}
        teamPlayers.forEach(p => {
          defaultRecords[p.id] = {
            attended: false,
            touchdowns_totales: 0,
            pases_completos: 0,
            intercepciones: 0,
            sacks: 0,
            isGameMVP: false,
            isWeeklyMVP: false
          }
        })

        // 1. Cargar Estadísticas
        const statsRes = await fetch(`/api/player-stats?game_id=${selectedGameId}`)
        const statsData = await statsRes.json()
        if (statsData.success) {
          statsData.data.forEach((stat: any) => {
            if (defaultRecords[stat.player_id]) {
              defaultRecords[stat.player_id] = { ...defaultRecords[stat.player_id], ...stat }
            }
          })
        }

        // 2. Cargar Asistencia
        const { data: attendanceData } = await supabase
          .from('game_attendance')
          .select('player_id, attended')
          .eq('game_id', selectedGameId)
        
        if (attendanceData) {
          attendanceData.forEach(att => {
            if (defaultRecords[att.player_id]) {
              defaultRecords[att.player_id].attended = att.attended
            }
          })
        }

        // 3. Cargar MVPs
        const { data: mvpsData } = await supabase
          .from('mvps')
          .select('player_id, mvp_type')
          .eq('category', selectedGame?.category || '')
          .eq('week_number', selectedGame?.jornada || 1)

        if (mvpsData) {
          mvpsData.forEach(mvp => {
            if (defaultRecords[mvp.player_id]) {
              if (mvp.mvp_type === 'game') defaultRecords[mvp.player_id].isGameMVP = true
              if (mvp.mvp_type === 'weekly') defaultRecords[mvp.player_id].isWeeklyMVP = true
            }
          })
        }

        setRecords(defaultRecords)
      } catch (error) {
        console.error("Error loading combined data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedGameId, selectedTeamId])

  const updateRecord = (playerId: number, field: string, value: any) => {
    setRecords(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value
      }
    }))
  }

  const handleSaveAll = async () => {
    if (!selectedGameId || !selectedTeamId || !selectedGame) return
    setSaving(true)

    try {
      const season = '2026' // Ajustar si tienes lógica dinámica
      const weekNumber = selectedGame.jornada || 1
      const category = selectedGame.category || 'Varonil-libre'

      // 1. Preparar Estadísticas
      const statsToSave = teamPlayers.map(p => ({
        player_id: p.id,
        game_id: selectedGameId,
        team_id: selectedTeamId,
        touchdowns_totales: records[p.id].touchdowns_totales || 0,
        pases_completos: records[p.id].pases_completos || 0,
        intercepciones: records[p.id].intercepciones || 0,
        sacks: records[p.id].sacks || 0,
      }))

      await fetch("/api/player-stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, stats: statsToSave }),
      })

      // 2. Preparar Asistencia
      const attendanceToSave = teamPlayers.map(p => ({
        game_id: selectedGameId,
        player_id: p.id,
        attended: records[p.id].attended
      }))

      // Guardar asistencia usando Supabase directo para evitar conflicto con APIs
      await supabase.from('game_attendance').delete().eq('game_id', selectedGameId).in('player_id', teamPlayers.map(p => p.id))
      await supabase.from('game_attendance').insert(attendanceToSave.filter(a => a.attended)) // O guardar todo con booleano

      // 3. Preparar MVPs
      // Primero limpiamos los MVPs de los jugadores de este equipo para esta semana/juego
      for (const p of teamPlayers) {
        const rec = records[p.id]
        
        // Game MVP
        if (rec.isGameMVP) {
          const { data: existGame } = await supabase.from('mvps').select('id').match({ player_id: p.id, season, category, week_number: weekNumber, mvp_type: 'game' })
          if (!existGame || existGame.length === 0) {
            await supabase.from('mvps').insert({ player_id: p.id, season, category, week_number: weekNumber, mvp_type: 'game' })
          }
        } else {
          await supabase.from('mvps').delete().match({ player_id: p.id, season, category, week_number: weekNumber, mvp_type: 'game' })
        }

        // Weekly MVP
        if (rec.isWeeklyMVP) {
          // Remover el MVP semanal de otros de esta categoría y semana (opcional si es exclusivo)
          await supabase.from('mvps').delete().match({ season, category, week_number: weekNumber, mvp_type: 'weekly' })
          await supabase.from('mvps').insert({ player_id: p.id, season, category, week_number: weekNumber, mvp_type: 'weekly' })
        } else {
          await supabase.from('mvps').delete().match({ player_id: p.id, season, category, week_number: weekNumber, mvp_type: 'weekly' })
        }
      }

      alert("¡Todos los datos (Asistencia, Estadísticas y MVPs) han sido guardados exitosamente!")
    } catch (error) {
      console.error("Error saving all data:", error)
      alert("Hubo un error al guardar los datos.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Gestión Rápida Unificada (Equipo)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Selectores Superiores */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-1 block">1. Elegir Equipo</label>
            <select
              value={selectedTeamId || ""}
              onChange={(e) => {
                setSelectedTeamId(e.target.value ? Number(e.target.value) : null)
                setSelectedGameId(null)
              }}
              className="w-full p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
            >
              <option value="">Selecciona un equipo...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 mb-1 block">2. Elegir Partido</label>
            <select
              value={selectedGameId || ""}
              onChange={(e) => setSelectedGameId(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
              disabled={!selectedTeamId}
            >
              <option value="">Selecciona el partido...</option>
              {teamGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.home_team} vs {g.away_team} - {new Date(g.game_date).toLocaleDateString("es-MX")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" /><p className="text-gray-500 mt-2">Cargando datos...</p></div>}

        {!loading && selectedGameId && teamPlayers.length > 0 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between mb-4">
              <span className="text-emerald-800 font-medium">Jugadores de {selectedTeam?.name}</span>
              <Button onClick={handleSaveAll} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Todo
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Jugador</th>
                    <th className="px-4 py-3 text-center">Asistencia</th>
                    <th className="px-4 py-3 text-center" title="Touchdowns Totales">TDs</th>
                    <th className="px-4 py-3 text-center" title="Pases Completos">Pas Comp</th>
                    <th className="px-4 py-3 text-center" title="Intercepciones">INTs</th>
                    <th className="px-4 py-3 text-center" title="Sacks">Sacks</th>
                    <th className="px-4 py-3 text-center">MVPs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {teamPlayers.map(player => {
                    const record = records[player.id] || { attended: false, touchdowns_totales: 0, pases_completos: 0, intercepciones: 0, sacks: 0, isGameMVP: false, isWeeklyMVP: false }
                    return (
                      <tr key={player.id} className={record.attended ? "bg-emerald-50/30" : ""}>
                        <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                           <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">#{player.jersey_number}</span>
                           {player.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch 
                            checked={record.attended} 
                            onCheckedChange={(val) => updateRecord(player.id, 'attended', val)} 
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <Input type="number" min="0" value={record.touchdowns_totales} onChange={(e) => updateRecord(player.id, 'touchdowns_totales', Number(e.target.value))} className="w-16 text-center mx-auto h-8 bg-gray-50 border-gray-300" />
                        </td>
                        <td className="px-2 py-3">
                          <Input type="number" min="0" value={record.pases_completos} onChange={(e) => updateRecord(player.id, 'pases_completos', Number(e.target.value))} className="w-16 text-center mx-auto h-8 bg-gray-50 border-gray-300" />
                        </td>
                        <td className="px-2 py-3">
                          <Input type="number" min="0" value={record.intercepciones} onChange={(e) => updateRecord(player.id, 'intercepciones', Number(e.target.value))} className="w-16 text-center mx-auto h-8 bg-gray-50 border-gray-300" />
                        </td>
                        <td className="px-2 py-3">
                          <Input type="number" min="0" value={record.sacks} onChange={(e) => updateRecord(player.id, 'sacks', Number(e.target.value))} className="w-16 text-center mx-auto h-8 bg-gray-50 border-gray-300" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => updateRecord(player.id, 'isGameMVP', !record.isGameMVP)}
                              className={`p-2 rounded-full transition-colors ${record.isGameMVP ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              title="MVP del Partido"
                            >
                              <Medal className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateRecord(player.id, 'isWeeklyMVP', !record.isWeeklyMVP)}
                              className={`p-2 rounded-full transition-colors ${record.isWeeklyMVP ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              title="MVP Semanal"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveAll} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Todo
              </Button>
            </div>
          </div>
        )}

        {!loading && selectedTeamId && teamPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-500">Este equipo no tiene jugadores registrados.</div>
        )}
      </CardContent>
    </Card>
  )
}