/**
 * api.ts — Client API pour le backend Django
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PredictionResult {
  success: boolean
  timestamp: string
  image_info: {
    name: string
    size_kb: number
    format: string
    dimensions: string
  }
  prediction: string
  confidence: number
  probabilities: Record<string, number>
  is_fractured: boolean
  gradcam_image: string
  heatmap_image: string
  report: MedicalReport
}

export interface MedicalReport {
  titre: string
  statut: string
  score_confiance: string
  resume_clinique: string
  observation_principale: string
  niveau_urgence: string
  recommandation: string
  actions_suggérées: string[]
  mise_en_garde: string
  type_examen: string
  methode_ia: string
  generated_by?: string
  differential_diagnosis?: string[]
  follow_up_imaging?: string
}

export interface ModelInfo {
  architecture: string
  framework: string
  classes: string[]
  input_size: string
  pretrained_on: string
  explainability: string
  model_loaded: boolean
  model_path: string
}

/**
 * Envoie une image au backend pour analyse.
 */
export async function analyzeImage(file: File, lang: 'FR' | 'EN' = 'FR'): Promise<PredictionResult> {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('lang', lang)

  const response = await fetch(`${API_BASE_URL}/api/predict/`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }))
    throw new Error(error.error || `Erreur HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Vérifie l'état de l'API backend.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health/`, {
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Récupère les informations du modèle.
 */
export async function getModelInfo(): Promise<ModelInfo> {
  const response = await fetch(`${API_BASE_URL}/api/model-info/`)
  if (!response.ok) throw new Error('Impossible de récupérer les infos du modèle')
  return response.json()
}
