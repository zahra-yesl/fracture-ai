"""
ml_engine.py — Moteur d'inférence ResNet50 + Grad-CAM
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

# ── Constantes ──────────────────────────────────────────────────────────────
IMG_SIZE    = 224
MEAN        = [0.485, 0.456, 0.406]
STD         = [0.229, 0.224, 0.225]
CLASS_NAMES = ['fractured', 'not fractured']

# ── Singleton du modèle ──────────────────────────────────────────────────────
_model_cache = None


def _build_model(num_classes: int = 2) -> nn.Module:
    """
    Architecture EXACTE du notebook d'entraînement :
    ResNet50 → Dropout(0.5) → Linear(2048→512) → ReLU → Dropout(0.3) → Linear(512→2)
    """
    model = models.resnet50(weights=None)
    in_features = model.fc.in_features  # 2048
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 512),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.3),
        nn.Linear(512, num_classes)
    )
    return model


def get_model(model_path: str, device: torch.device) -> nn.Module:
    """Charge le modèle une seule fois (pattern singleton)."""
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
            logger.info(f"✅ Modèle ResNet50 chargé depuis {model_path} (val_acc={val_acc:.2f}%)")
        except Exception as e:
            logger.error(f"⚠️ Erreur chargement modèle : {e}")
    else:
        logger.warning(f"⚠️ Modèle non trouvé : {model_path} — mode démo activé")

    model.to(device)
    model.eval()
    _model_cache = model
    return model


def preprocess_image(pil_image: Image.Image) -> torch.Tensor:
    """Prétraite une image PIL pour l'inférence."""
    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])
    if pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    return transform(pil_image).unsqueeze(0)


# ── Grad-CAM manuel pour ResNet50 ────────────────────────────────────────────
class GradCAMResNet:
    """
    Grad-CAM pour ResNet50.
    Couche cible : layer4[-1] (dernière couche conv du backbone)
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

        # Dernière couche conv de ResNet50 = layer4[-1]
        target_layer = self.model.layer4[-1]
        target_layer.register_forward_hook(forward_hook)
        target_layer.register_full_backward_hook(backward_hook)

    def generate(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """Génère la heatmap Grad-CAM. Retourne array [0,1] de taille IMG_SIZE."""
        self.model.zero_grad()

        input_tensor = input_tensor.clone().requires_grad_(True)
        output = self.model(input_tensor)

        # Backprop sur la classe cible
        score = output[0, target_class]
        score.backward()

        # Pondération des feature maps par leurs gradients moyens
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)  # [1, C, 1, 1]
        cam     = (weights * self.activations).sum(dim=1, keepdim=True)  # [1, 1, H, W]
        cam     = torch.relu(cam)

        # Normalisation [0, 1]
        cam = cam.squeeze().cpu().numpy()
        if cam.max() > 0:
            cam = cam / cam.max()

        # Resize vers 224x224
        import cv2
        cam_resized = cv2.resize(cam, (IMG_SIZE, IMG_SIZE))
        return cam_resized


def apply_colormap(heatmap: np.ndarray, original_img: np.ndarray, alpha: float = 0.4) -> np.ndarray:
    """Superpose la heatmap colorisée sur l'image originale."""
    import cv2
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_rgb   = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
    original_uint8 = (original_img * 255).astype(np.uint8)
    superimposed  = cv2.addWeighted(original_uint8, 1 - alpha, heatmap_rgb, alpha, 0)
    return superimposed


def image_to_base64(img_array: np.ndarray) -> str:
    """Convertit un array numpy en base64 PNG."""
    img_pil = Image.fromarray(img_array.astype(np.uint8))
    buffer  = io.BytesIO()
    img_pil.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def run_inference(pil_image: Image.Image, model_path: str) -> dict:
    """
    Pipeline complet : prétraitement → prédiction → Grad-CAM.

    Returns:
        dict avec prediction, confidence, gradcam_base64, heatmap_base64
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model  = get_model(model_path, device)

    # Prétraitement
    input_tensor = preprocess_image(pil_image).to(device)

    # Inférence
    model.eval()
    with torch.no_grad():
        output     = model(input_tensor.clone())
        probs      = torch.softmax(output, dim=1)
        pred_class = probs.argmax().item()
        confidence = probs[0][pred_class].item()

    # Grad-CAM
    grad_cam = GradCAMResNet(model)
    heatmap  = grad_cam.generate(input_tensor, pred_class)

    # Image originale normalisée pour superposition
    img_resized  = pil_image.convert('RGB').resize((IMG_SIZE, IMG_SIZE))
    img_np       = np.array(img_resized) / 255.0
    superimposed = apply_colormap(heatmap, img_np)

    # Heatmap seule colorisée
    import cv2
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_rgb   = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    all_probs = probs[0].tolist()

    return {
        'prediction'      : CLASS_NAMES[pred_class],
        'predicted_class' : pred_class,
        'confidence'      : round(confidence * 100, 2),
        'probabilities'   : {
            CLASS_NAMES[i]: round(all_probs[i] * 100, 2)
            for i in range(len(CLASS_NAMES))
        },
        'gradcam_base64'  : image_to_base64(superimposed),
        'heatmap_base64'  : image_to_base64(heatmap_rgb),
    }