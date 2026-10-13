"""Rutas del módulo de Dashboard."""
from django.urls import path

from .views import DashboardSummaryView

urlpatterns = [
    path("summary/", DashboardSummaryView.as_view(), name="dashboard_summary"),
]
