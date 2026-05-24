from django.urls import path
from .views import HealthCheckView, PredictView, ModelInfoView

urlpatterns = [
    path('health/',     HealthCheckView.as_view(), name='health-check'),
    path('predict/',    PredictView.as_view(),     name='predict'),
    path('model-info/', ModelInfoView.as_view(),   name='model-info'),
]
