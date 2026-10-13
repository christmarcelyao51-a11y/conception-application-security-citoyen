import { z } from 'zod'

export const analysisSchema = z.object({
  urgencyLevel: z
    .enum(['critique', 'elevee', 'moderee', 'faible'])
    .describe('Niveau d’urgence estimé de la situation'),
  urgencyScore: z.number().min(0).max(100).describe('Score d’urgence de 0 à 100'),
  credibilityScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Crédibilité du signalement de 0 (probable fausse alerte) à 100 (très crédible)'),
  falseAlertRisk: z.enum(['faible', 'moyen', 'eleve']).describe('Risque de fausse alerte'),
  recommendedServices: z
    .array(z.enum(['police', 'gendarmerie', 'samu', 'pompiers', 'ccdo', 'autre']))
    .describe('Services d’urgence recommandés, par ordre de priorité'),
  summary: z.string().describe('Résumé factuel de la situation en 1 à 2 phrases, en français'),
  detectedSignals: z
    .array(z.string())
    .describe('Indices concrets d’urgence détectés (texte, voix, image)'),
  suspiciousIndicators: z
    .array(z.string())
    .describe('Éléments qui pourraient indiquer une fausse alerte ou une incohérence'),
  citizenAdvice: z
    .array(z.string())
    .describe('Consignes de sécurité courtes à donner au citoyen en attendant les secours'),
})

export type Analysis = z.infer<typeof analysisSchema>

export type AnalyzeRequest = {
  serviceId: string
  description: string
  transcript: string
  frames: string[]
  location?: { lat: number; lng: number; accuracy?: number }
}
