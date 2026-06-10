"""
report_generator.py — Rapport médical via Gemini Flash
Chaque appel est tracé automatiquement par Arize Phoenix.

COMMENT CA MARCHE :
1. Le médecin uploade une radio
2. ResNet50 prédit (fracture / non-fracture) dans ml_engine.py
3. Ce fichier envoie le résultat à Gemini Flash
4. Gemini génère un rapport médical professionnel en JSON
5. Phoenix enregistre la trace de cet appel dans le dashboard
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

# ── Activation Arize Phoenix (une seule fois au démarrage) ───────────────────
def setup_phoenix_tracing():
    """
    Configure Phoenix pour intercepter tous les appels Gemini.
    Sans cette fonction, Phoenix ne verra rien.
    """
    try:
        from phoenix.otel import register
        from openinference.instrumentation.google_genai import GoogleGenAIInstrumentor

        endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "https://app.phoenix.arize.com")
        if not endpoint.endswith("/v1/traces"):
            endpoint += "/v1/traces"

        register(
            project_name="radisense",
            endpoint=endpoint,
            headers={"api_key": os.getenv('PHOENIX_API_KEY', '')},
        )
        # Instrument Gemini → chaque appel genai = une trace dans Phoenix
        GoogleGenAIInstrumentor().instrument()
        logger.info("✅ Arize Phoenix tracing activé — projet : radisense")
    except Exception as e:
        logger.warning(f"⚠️ Phoenix non disponible : {e}")


setup_phoenix_tracing()


# ── Fonction principale ──────────────────────────────────────────────────────
def generate_medical_report(
    prediction: str,
    confidence: float,
    probabilities: dict,
    api_key: str = "",
    lang: str = "FR"
) -> dict:
    """
    Génère le rapport médical.
    - Avec GEMINI_API_KEY → rapport intelligent via Gemini Flash
    - Sans clé → rapport statique (fallback)
    - lang : 'FR' ou 'EN'
    """
    gemini_key = api_key or os.getenv("GEMINI_API_KEY", "")

    if gemini_key:
        try:
            return _gemini_report(prediction, confidence, probabilities, gemini_key, lang)
        except Exception as e:
            logger.error(f"Gemini erreur : {e} — fallback statique utilisé")

    return _static_report(prediction, confidence, lang)


# ── Rapport Gemini Flash ─────────────────────────────────────────────────────
def _gemini_report(prediction, confidence, probabilities, api_key, lang="FR"):
    """
    Appel Gemini 2.0 Flash avec prompt bilingue FR/EN.
    """
    import google.genai as genai
    client = genai.Client(api_key=api_key)

    fracture = prediction == "fractured"
    urgence_fr = "Elevé" if (fracture and confidence > 80) else "Modéré" if fracture else "Faible"
    urgence_en = "High"   if (fracture and confidence > 80) else "Moderate" if fracture else "Low"
    urgence    = urgence_fr if lang == "FR" else urgence_en

    if lang == "EN":
        prompt = f"""You are an advanced clinical decision support assistant for radiologists and physicians.
Generate a structured JSON clinical report in ENGLISH for the attending physician (do not address the patient).
Use formal medical terminology (suspected fracture type, cortical disruption, bone density, clinical urgency).

Automated computer analysis results (ResNet50):
- Imaging indication: {"FRACTURE DETECTED" if fracture else "NO FRACTURE DETECTED"}
- Algorithmic confidence: {confidence:.1f}%
- P(fracture): {probabilities.get('fractured', 0):.1f}%
- P(normal):   {probabilities.get('not fractured', 0):.1f}%
- Clinical urgency: {urgence}

Respond ONLY as a strict flat JSON object (no markdown, no code fences, no extra whitespace) with this exact structure:
{{
  "titre": "Clinical Decision Support Report — RadiSense AI",
  "statut": "Fracture detected" or "No fracture detected",
  "score_confiance": "{confidence:.1f}%",
  "resume_clinique": "2 sentences of rigorous medical assessment for the clinician, describing suspicion of cortical disruption or trabecular alignment.",
  "recommandation": "Specific clinical recommendation for the physician (e.g. type of immobilisation, specialist referral, analgesic management)",
  "actions_suggerees": ["First medical action", "Second medical action", "Third medical action"],
  "niveau_urgence": "{urgence}",
  "mise_en_garde": "\u26a0\ufe0f Clinical decision support tool. Final diagnostic responsibility rests solely with the attending physician.",
  "methode_ia": "ResNet50 + Grad-CAM (Transfer Learning ImageNet)",
  "generated_by": "RadiSense AI — Clinical Decision Support",
  "differential_diagnosis": ["Differential diagnosis 1", "Differential diagnosis 2", "Differential diagnosis 3"],
  "follow_up_imaging": "Suggested complementary imaging (e.g. CT scan, MRI or additional radiological projection)"
}}"""
    else:
        prompt = f"""Tu es un assistant de diagnostic médical de pointe destiné aux cliniciens.
Génère un rapport clinique d'aide à la décision en JSON strict en FRANÇAIS destiné au médecin traitant (ne t'adresse pas au patient).
Utilise une terminologie médicale formelle et rigoureuse (type de fracture suspecte, présence/absence de rupture corticale, appréciation de la densité osseuse, niveau d'urgence clinique).

Résultats de l'analyse automatisée par ordinateur (ResNet50) :
- Indication d'imagerie : {"FRACTURE DÉTECTÉE" if fracture else "AUCUN SIGNE DE FRACTURE"}
- Niveau de confiance algorithmique : {confidence:.1f}%
- P(fracture) : {probabilities.get('fractured', 0):.1f}%
- P(normal)   : {probabilities.get('not fractured', 0):.1f}%
- Niveau d'urgence clinique : {urgence}

Réponds uniquement sous la forme d'un objet JSON plat strict (sans markdown, sans bloc de code ```, sans espaces superflus) avec la structure exacte suivante :
{{
  "titre": "Rapport d'Aide à la Décision Clinique — RadiSense AI",
  "statut": "Fracture détectée" ou "Aucune fracture détectée",
  "score_confiance": "{confidence:.1f}%",
  "resume_clinique": "2 phrases d'évaluation médicale rigoureuse pour le clinicien, décrivant la suspicion de rupture corticale ou d'alignement trabéculaire.",
  "recommandation": "recommandation clinique précise pour le médecin (ex: type d'immobilisation, avis spécialisé, prise en charge antalgique)",
  "actions_suggerees": ["Première action médicale", "Deuxième action médicale", "Troisième action médicale"],
  "niveau_urgence": "{urgence}",
  "mise_en_garde": "\u26a0\ufe0f Outil d'aide à la décision clinique. La responsabilité du diagnostic final incombe exclusivement au médecin signataire.",
  "methode_ia": "ResNet50 + Grad-CAM (Transfer Learning ImageNet)",
  "generated_by": "RadiSense AI — Clinical Decision Support",
  "differential_diagnosis": ["Diagnostic différentiel 1", "Diagnostic différentiel 2", "Diagnostic différentiel 3"],
  "follow_up_imaging": "Examens complémentaires d'imagerie suggérés (ex: TDM, IRM ou incidence radiologique complémentaire spécifique)"
}}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt
    )
    text = response.text.strip()

    # Nettoyer si Gemini ajoute des backticks malgré la consigne
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text.strip())

    # Renommer la clé pour compatibilité frontend
    if "actions_suggerees" in result and "actions_suggérées" not in result:
        result["actions_suggérées"] = result.pop("actions_suggerees")

    return result


# ── Rapport statique (fallback sans API) ────────────────────────────────────
def _static_report(prediction: str, confidence: float, lang: str = "FR") -> dict:
    """Rapport de secours si Gemini est indisponible. Bilingue FR/EN."""
    fracture   = prediction == "fractured"
    urgence_fr = "Elevé"   if (fracture and confidence > 80) else "Modéré" if fracture else "Faible"
    urgence_en = "High"    if (fracture and confidence > 80) else "Moderate" if fracture else "Low"
    urgence    = urgence_fr if lang == "FR" else urgence_en

    if lang == "EN":
        return {
            "titre"          : "Clinical Decision Support Report — RadiSense AI",
            "statut"         : "Fracture detected" if fracture else "No fracture detected",
            "score_confiance": f"{confidence:.1f}%",
            "resume_clinique": (
                "Automated analysis has identified a suspicious cortical discontinuity with disruption of the trabecular architecture. "
                "Thorough clinical and radiological correlation is recommended to characterise the fracture type."
                if fracture else
                "Automated analysis has not identified cortical disruption or significant trabecular displacement. "
                "Overall bone density appears within normal limits, pending clinical confirmation."
            ),
            "recommandation" : (
                "Urgent orthopaedic referral, temporary immobilisation of the affected joint and neurovascular assessment of the distal limb."
                if fracture else
                "Continue clinical monitoring. Repeat radiological assessment if symptoms persist or worsen."
            ),
            "actions_suggérées": (
                ["Urgent orthopaedic referral", "Temporary immobilisation", "Distal neurovascular check"]
                if fracture else
                ["Standard clinical monitoring", "Analgesic management per protocol", "Reassessment at 48–72h"]
            ),
            "niveau_urgence" : urgence,
            "mise_en_garde"  : "\u26a0\ufe0f Clinical decision support tool. Final diagnostic responsibility rests solely with the attending physician.",
            "methode_ia"     : "ResNet50 + Grad-CAM (Transfer Learning ImageNet)",
            "generated_by"   : "RadiSense AI — Clinical Decision Support",
            "differential_diagnosis": (
                ["Spiral or oblique fracture", "Incomplete cortical fissure", "Underlying osteolytic lesion"]
                if fracture else
                ["Bone contusion", "Ligamentous sprain", "Occult micro-trabecular injury"]
            ),
            "follow_up_imaging": (
                "Orthogonal radiographic projections or CT scan for 3D characterisation."
                if fracture else
                "MRI if clinical suspicion of occult fracture persists despite normal plain film."
            )
        }

    # Fallback français
    return {
        "titre"          : "Rapport d'Aide à la Décision Clinique — RadiSense AI",
        "statut"         : "Fracture détectée" if fracture else "Aucune fracture détectée",
        "score_confiance": f"{confidence:.1f}%",
        "resume_clinique": (
            "L'analyse automatisée par ordinateur a mis en évidence une discontinuité corticale suspecte avec rupture de la continuité trabéculaire. "
            "Une corrélation clinique et radiologique approfondie est recommandée pour évaluer le type de fracture."
            if fracture else
            "L'analyse automatisée par ordinateur n'a pas détecté de rupture de la corticale ni de déplacement trabéculaire significatif. "
            "La densité osseuse globale apparaît dans les limites de la normale sous réserve de confirmation clinique."
        ),
        "recommandation" : (
            "Avis orthopédique spécialisé, immobilisation temporaire de l'articulation concernée et évaluation de la fonction neurovasculaire distale."
            if fracture else
            "Surveillance clinique continue. Réévaluation radiologique en cas de persistance ou d'aggravation de la symptomatologie fonctionnelle."
        ),
        "actions_suggérées": (
            ["Avis orthopédique spécialisé", "Immobilisation temporaire", "Contrôle neurovasculaire distal"]
            if fracture else
            ["Surveillance clinique standard", "Prise en charge antalgique selon protocole", "Réévaluation à 48-72h"]
        ),
        "niveau_urgence" : urgence,
        "mise_en_garde"  : "\u26a0\ufe0f Outil d'aide à la décision clinique. La responsabilité du diagnostic final incombe exclusivement au médecin signataire.",
        "methode_ia"     : "ResNet50 + Grad-CAM (Transfer Learning ImageNet)",
        "generated_by"   : "RadiSense AI — Clinical Decision Support",
        "differential_diagnosis": (
            ["Fracture spiroïde ou oblique", "Fissure corticale incomplète", "Lésion ostéolytique sous-jacente"]
            if fracture else
            ["Contusion osseuse simple", "Entorse ligamentaire", "Lésion micro-trabéculaire infra-radiologique"]
        ),
        "follow_up_imaging": (
            "Radiographies orthogonales complémentaires ou Tomodensitométrie (TDM) pour caractérisation 3D."
            if fracture else
            "Imagerie par résonance magnétique (IRM) si la suspicion clinique de fracture occulte persiste."
        )
    }