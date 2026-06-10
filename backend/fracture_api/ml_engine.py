"""
ml_engine.py — ResNet50 + Grad-CAM
Chaque prédiction est tracée dans Arize Phoenix via OpenTelemetry.

COMMENT CA MARCHE :
1. L'image arrive depuis le frontend
2. ResNet50 prédit la classe (fractured / not fractured)
3. Grad-CAM génère la heatmap des zones décisives
4. Un "span" OpenTelemetry est créé → envoyé à Phoenix
5. Phoenix affiche la prédiction dans le dashboard en temps réel
"""

import os
import io
import base64
import logging
import numpy as np

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image

logger = logging.getLogger(__name__)

# ── Constantes ───────────────────────────────────────────────────────────────
IMG_SIZE    = 224
MEAN        = [0.485, 0.456, 0.406]
STD         = [0.229, 0.224, 0.225]
CLASS_NAMES = ['fractured', 'not fractured']

# ── Singleton modèle ─────────────────────────────────────────────────────────
_model_cache = None


def _build_model(num_classes: int = 2) -> nn.Module:
    """
    Architecture exacte du notebook d'entraînement.
    ResNet50 → Dropout(0.5) → FC(2048→512) → ReLU → Dropout(0.3) → FC(512→2)
    """
    model = models.resnet50(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 512),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.3),
        nn.Linear(512, num_classes)
    )
    return model


def get_model(model_path: str, device: torch.device) -> nn.Module:
    """Charge le modèle une seule fois (singleton)."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model = _build_model()

    if os.path.exists(model_path):
        try:
            checkpoint = torch.load(model_path, map_location=device)
            state_dict = checkpoint.get('model_state_dict', checkpoint)
            model.load_state_dict(state_dict)
            val_acc = checkpoint.get('val_acc', 0) * 100
            logger.info(f"✅ ResNet50 chargé — Val Acc: {val_acc:.2f}%")
        except Exception as e:
            logger.error(f"⚠️ Erreur chargement modèle : {e}")
    else:
        logger.warning(f"⚠️ Modèle non trouvé : {model_path} — mode démo")

    model.to(device)
    model.eval()
    _model_cache = model
    return model


def preprocess_image(pil_image: Image.Image) -> torch.Tensor:
    """Prétraite l'image pour ResNet50."""
    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    if pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    return transform(pil_image).unsqueeze(0)


# ── Grad-CAM ─────────────────────────────────────────────────────────────────
class GradCAMResNet:
    """
    Grad-CAM sur layer4[-1] de ResNet50.
    Génère une heatmap montrant où le modèle regarde pour décider.
    Rouge = zone très importante pour la prédiction.
    """
    def __init__(self, model: nn.Module):
        self.model       = model
        self.gradients   = None
        self.activations = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        target_layer = self.model.layer4[-1]
        target_layer.register_forward_hook(forward_hook)
        target_layer.register_full_backward_hook(backward_hook)

    def generate(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        self.model.zero_grad()
        input_tensor = input_tensor.clone().requires_grad_(True)
        output = self.model(input_tensor)
        output[0, target_class].backward()

        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam     = (weights * self.activations).sum(dim=1, keepdim=True)
        cam     = torch.relu(cam).squeeze().cpu().numpy()

        if cam.max() > 0:
            cam = cam / cam.max()

        import cv2
        return cv2.resize(cam, (IMG_SIZE, IMG_SIZE))


def apply_colormap(heatmap: np.ndarray, original_img: np.ndarray, alpha: float = 0.4) -> np.ndarray:
    import cv2
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_rgb   = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    original_uint8 = (original_img * 255).astype(np.uint8)
    return cv2.addWeighted(original_uint8, 1 - alpha, heatmap_rgb, alpha, 0)


def image_to_base64(img_array: np.ndarray) -> str:
    img_pil = Image.fromarray(img_array.astype(np.uint8))
    buffer  = io.BytesIO()
    img_pil.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


# ── Pipeline principal avec trace Phoenix ────────────────────────────────────
def run_inference(pil_image: Image.Image, model_path: str) -> dict:
    """
    Pipeline complet : image → prédiction → Grad-CAM → trace Phoenix.

    La trace Phoenix enregistre :
    - La prédiction (fractured / not fractured)
    - Le score de confiance
    - Le temps de traitement
    - Les probabilités des 2 classes
    """
    import time
    start_time = time.time()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model  = get_model(model_path, device)

    # Prétraitement
    input_tensor = preprocess_image(pil_image).to(device)

    # Prédiction
    model.eval()
    with torch.no_grad():
        output     = model(input_tensor.clone())
        probs      = torch.softmax(output, dim=1)
        pred_class = probs.argmax().item()
        confidence = probs[0][pred_class].item()

    # Grad-CAM
    grad_cam     = GradCAMResNet(model)
    heatmap      = grad_cam.generate(input_tensor, pred_class)
    img_resized  = pil_image.convert('RGB').resize((IMG_SIZE, IMG_SIZE))
    img_np       = np.array(img_resized) / 255.0
    superimposed = apply_colormap(heatmap, img_np)

    import cv2
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_rgb   = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    all_probs     = probs[0].tolist()
    latency_ms    = round((time.time() - start_time) * 1000, 1)
    prediction    = CLASS_NAMES[pred_class]
    confidence_pct = round(confidence * 100, 2)

    # ── Trace Arize Phoenix ───────────────────────────────────────────────
    # Enregistre cette prédiction dans le dashboard Phoenix
    # Visible sur : app.phoenix.arize.com/s/radisense
    _trace_prediction(prediction, confidence_pct, all_probs, latency_ms)

    return {
        'prediction'     : prediction,
        'predicted_class': pred_class,
        'confidence'     : confidence_pct,
        'probabilities'  : {
            CLASS_NAMES[i]: round(all_probs[i] * 100, 2)
            for i in range(len(CLASS_NAMES))
        },
        'gradcam_base64' : image_to_base64(superimposed),
        'heatmap_base64' : image_to_base64(heatmap_rgb),
        'latency_ms'     : latency_ms,
    }


def _trace_prediction(prediction: str, confidence: float, probs: list, latency_ms: float):
    """
    Envoie un span OpenTelemetry à Arize Phoenix.
    Chaque prédiction devient une trace visible dans le dashboard.
    """
    try:
        from opentelemetry import trace
        from opentelemetry.trace import SpanKind

        tracer = trace.get_tracer("radisense.ml_engine")

        with tracer.start_as_current_span(
            "fracture_prediction",
            kind=SpanKind.INTERNAL
        ) as span:
            span.set_attribute("model.name",       "ResNet50")
            span.set_attribute("model.version",    "1.0.0")
            span.set_attribute("prediction.class", prediction)
            span.set_attribute("prediction.confidence", confidence)
            span.set_attribute("prediction.prob_fractured",    round(probs[0] * 100, 2))
            span.set_attribute("prediction.prob_not_fractured", round(probs[1] * 100, 2))
            span.set_attribute("inference.latency_ms", latency_ms)
            span.set_attribute("explainability.method", "Grad-CAM layer4[-1]")

    except Exception as e:
        logger.debug(f"Phoenix trace non envoyée : {e}")