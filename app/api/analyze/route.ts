import { generateText, Output } from 'ai'
import { analysisSchema, type AnalyzeRequest } from '@/lib/analysis'

export const maxDuration = 60

const MAX_FRAMES = 3
const MAX_TEXT = 4000

const SYSTEM_PROMPT = `Tu es l'agent IA de tri d'urgence de l'application SECURITY CITOYEN.
Tu assistes les opérateurs des services d'urgence (Police, Gendarmerie, SAMU, Sapeurs-pompiers, CCDO, protection civile).
Pour chaque signalement, tu analyses la description écrite, la transcription vocale et les images extraites de la vidéo en direct.
Objectifs :
1. Évaluer le niveau d'urgence réel (danger vital, blessés, feu, arme, violence en cours...).
2. Évaluer la crédibilité du signalement et détecter les indices de fausse alerte (incohérences entre texte et image, image sans rapport, ton moqueur, contenu absurde, absence totale de détails).
3. Recommander le ou les services les plus adaptés.
4. Donner des consignes de sécurité simples au citoyen.
Règles : sois factuel et prudent. En cas de doute sur un danger vital, privilégie la sécurité (urgence élevée) tout en signalant le doute. Ne rejette jamais une alerte : tu aides seulement à prioriser. Réponds en français.`

export async function POST(req: Request) {
  let body: AnalyzeRequest
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const description = String(body.description ?? '').slice(0, MAX_TEXT)
  const transcript = String(body.transcript ?? '').slice(0, MAX_TEXT)
  const frames = Array.isArray(body.frames)
    ? body.frames
        .filter((f) => typeof f === 'string' && f.startsWith('data:image/'))
        .slice(0, MAX_FRAMES)
    : []

  if (!description.trim() && !transcript.trim() && frames.length === 0) {
    return Response.json(
      { error: 'Ajoutez une description, un message vocal ou une vidéo.' },
      { status: 400 },
    )
  }

  const context = [
    `Service demandé par le citoyen : ${String(body.serviceId ?? 'non précisé')}`,
    `Description écrite : ${description || '(aucune)'}`,
    `Transcription vocale : ${transcript || '(aucune)'}`,
    `Images de la vidéo en direct : ${frames.length}`,
    body.location
      ? `Position GPS : ${body.location.lat.toFixed(5)}, ${body.location.lng.toFixed(5)} (précision ${Math.round(body.location.accuracy ?? 0)} m)`
      : 'Position GPS : indisponible',
  ].join('\n')

  try {
    const { output } = await generateText({
      model: 'google/gemini-3.8-flash',
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: analysisSchema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: context },
            ...frames.map((data) => ({
              type: 'file' as const,
              mediaType: 'image' as const,
              data,
            })),
          ],
        },
      ],
    })

    return Response.json(output)
  } catch (error) {
    console.error('[analyze] AI analysis failed', error)
    return Response.json(
      { error: 'L’analyse IA est momentanément indisponible. Vous pouvez envoyer l’alerte quand même.' },
      { status: 502 },
    )
  }
}
