"""
report_generator.py — Génération de rapport médical structuré (sans API externe)
"""

import logging

logger = logging.getLogger(__name__)


def generate_medical_report(
    prediction: str,
    confidence: float,
    probabilities: dict,
    api_key: str = ""
) -> dict:
    """
    Génère un rapport médical structuré basé sur les prédictions du modèle.
    Pas de dépendance externe — rapport statique professionnel.
    """
    return _demo_report(prediction, confidence)


def _demo_report(prediction: str, confidence: float) -> dict:
    """Rapport médical structuré basé sur la prédiction du modèle ResNet50."""
    fracture = prediction == 'fractured'
    return {
        "titre": "Rapport d'Analyse Radiographique IA",
        "statut": "Fracture détectée" if fracture else "Aucune fracture détectée",
        "score_confiance": f"{confidence:.1f}%",
        "resume_clinique": (
            "L'analyse par intelligence artificielle a identifié des indicateurs radiographiques "
            "compatibles avec une fracture osseuse. Une évaluation clinique approfondie est recommandée."
            if fracture else
            "L'analyse par intelligence artificielle n'a pas détecté d'indicateurs radiographiques "
            "caractéristiques d'une fracture. Un suivi clinique standard est conseillé."
        ),
        "observation_principale": (
            "Le modèle ResNet50 a localisé des zones d'anomalie dans la structure osseuse, "
            "présentant des caractéristiques radiographiques associées aux fractures."
            if fracture else
            "La structure osseuse analysée présente des caractéristiques radiographiques normales "
            "sans discontinuité corticale évidente détectée par le système."
        ),
        "niveau_urgence": "Élevé" if (fracture and confidence > 80) else "Modéré" if fracture else "Faible",
        "recommandation": (
            "Consultation orthopédique urgente recommandée. Immobilisation en attente d'évaluation spécialisée."
            if fracture else
            "Poursuite du suivi clinique standard. Réévaluation si symptômes persistants."
        ),
        "actions_suggérées": (
            ["Consulter un orthopédiste", "Immobiliser la zone concernée", "Réaliser des clichés complémentaires"]
            if fracture else
            ["Surveillance clinique", "Antalgie si nécessaire", "Réévaluation à 48-72h si douleur persistante"]
        ),
        "mise_en_garde": (
            "⚠️ Ce rapport est généré automatiquement par un système d'intelligence artificielle "
            "et constitue une aide à la décision médicale uniquement. Il ne remplace en aucun cas "
            "l'expertise d'un médecin qualifié."
        ),
        "type_examen": "Radiographie X-ray — Détection de fracture",
        "methode_ia": "ResNet50 avec Grad-CAM (Transfer Learning ImageNet)",
        "generated_by": "Système IA — FractureAI"
    }