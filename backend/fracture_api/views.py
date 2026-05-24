import os
import logging
from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from PIL import Image

from .ml_engine import run_inference
from .report_generator import generate_medical_report

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """GET /api/health/ — Vérification que l'API est active."""

    def get(self, request):
        return Response({
            'status'   : 'ok',
            'message'  : 'Fracture Detection API is running',
            'timestamp': datetime.now().isoformat(),
            'version'  : '1.0.0'
        })


class PredictView(APIView):
    """
    POST /api/predict/
    Body : multipart/form-data avec champ 'image' (fichier image)
    Retourne : prédiction + Grad-CAM + rapport structuré
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # ── 1. Validation de l'image ──────────────────────────────────────
        if 'image' not in request.FILES:
            return Response(
                {'error': "Aucune image fournie. Champ requis : 'image'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Vérification du type de fichier
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': f"Type de fichier non supporté : {image_file.content_type}. "
                          f"Formats acceptés : JPEG, PNG, WEBP"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 2. Chargement de l'image ──────────────────────────────────────
        try:
            pil_image = Image.open(image_file).convert('RGB')
        except Exception as e:
            logger.error(f"Erreur ouverture image : {e}")
            return Response(
                {'error': f"Impossible de lire l'image : {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 3. Inférence ML + Grad-CAM ────────────────────────────────────
        try:
            model_path = str(settings.MODEL_PATH)
            inference_result = run_inference(pil_image, model_path)
            logger.info(f"Inférence réussie : {inference_result['prediction']} ({inference_result['confidence']}%)")
        except Exception as e:
            logger.error(f"Erreur inférence : {e}")
            return Response(
                {'error': f"Erreur lors de l'analyse de l'image : {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ── 4. Génération du rapport via Claude API ───────────────────────
        try:
            api_key = settings.ANTHROPIC_API_KEY
            report  = generate_medical_report(
                prediction    = inference_result['prediction'],
                confidence    = inference_result['confidence'],
                probabilities = inference_result['probabilities'],
                api_key       = api_key
            )
        except Exception as e:
            logger.error(f"Erreur génération rapport : {e}")
            report = {'error': 'Rapport non disponible', 'detail': str(e)}

        # ── 5. Réponse complète ───────────────────────────────────────────
        return Response({
            'success'        : True,
            'timestamp'      : datetime.now().isoformat(),
            'image_info'     : {
                'name'        : image_file.name,
                'size_kb'     : round(image_file.size / 1024, 1),
                'format'      : pil_image.format or 'JPEG',
                'dimensions'  : f"{pil_image.width}x{pil_image.height}"
            },
            'prediction'     : inference_result['prediction'],
            'confidence'     : inference_result['confidence'],
            'probabilities'  : inference_result['probabilities'],
            'is_fractured'   : inference_result['prediction'] == 'fractured',
            'gradcam_image'  : f"data:image/png;base64,{inference_result['gradcam_base64']}",
            'heatmap_image'  : f"data:image/png;base64,{inference_result['heatmap_base64']}",
            'report'         : report,
        }, status=status.HTTP_200_OK)


class ModelInfoView(APIView):
    """GET /api/model-info/ — Informations sur le modèle."""

    def get(self, request):
        model_path = str(settings.MODEL_PATH)
        model_exists = os.path.exists(model_path)

        return Response({
            'architecture'  : 'EfficientNet-B3',
            'framework'     : 'PyTorch + timm',
            'classes'       : ['fractured', 'not fractured'],
            'input_size'    : '224x224',
            'pretrained_on' : 'ImageNet',
            'explainability': 'Grad-CAM',
            'model_loaded'  : model_exists,
            'model_path'    : model_path if model_exists else 'Non trouvé — mode démo',
        })
