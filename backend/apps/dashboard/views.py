"""
Vistas del módulo de Dashboard.

Expone un único endpoint (GET /api/dashboard/summary/) que agrega
todos los KPIs e insumos de gráficos que necesita el dashboard del
frontend, calculados directamente contra la base de datos (nunca con
datos simulados). El resultado se filtra según el rol del usuario,
igual que en Tickets: un técnico solo ve sus propias métricas y un
cliente solo ve las de sus propios tickets.
"""
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tickets.models import Priority, Status, Ticket
from apps.users.models import Role


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def _scoped_queryset(self, user):
        qs = Ticket.objects.select_related("status", "priority", "category", "technician")
        role = user.role_name
        if role == Role.TECHNICIAN:
            return qs.filter(technician__user=user)
        if role == Role.CLIENT:
            return qs.filter(client__user=user)
        return qs  # Administrador ve todo

    def get(self, request):
        tickets = self._scoped_queryset(request.user)

        total = tickets.count()
        by_status_counts = {
            "open": tickets.filter(status__name=Status.NEW).count(),
            "assigned": tickets.filter(status__name=Status.ASSIGNED).count(),
            "in_progress": tickets.filter(status__name=Status.IN_PROGRESS).count(),
            "on_hold": tickets.filter(status__name=Status.ON_HOLD).count(),
            "resolved": tickets.filter(status__name=Status.RESOLVED).count(),
            "closed": tickets.filter(status__name=Status.CLOSED).count(),
        }

        # SLA: se recorre solo el subconjunto de tickets abiertos (no
        # cerrados) porque sla_compliance() es una operación en
        # Python, no una consulta SQL agregada.
        open_tickets = tickets.exclude(status__is_closed=True).select_related("sla")
        overdue = 0
        due_soon = 0
        for ticket in open_tickets:
            state = ticket.sla_compliance()["state"]
            if state == "incumplido":
                overdue += 1
            elif state == "proximo_a_vencer":
                due_soon += 1

        closed_tickets = tickets.filter(status__is_closed=True)
        sla_met = 0
        sla_total_evaluated = 0
        for ticket in closed_tickets.select_related("sla"):
            if ticket.sla:
                sla_total_evaluated += 1
                if ticket.sla_compliance()["state"] == "cumplido":
                    sla_met += 1
        sla_compliance_pct = round((sla_met / sla_total_evaluated) * 100, 1) if sla_total_evaluated else None

        avg_response = tickets.exclude(response_time_minutes__isnull=True).aggregate(
            avg=Avg("response_time_minutes")
        )["avg"]
        avg_resolution = tickets.exclude(resolution_time_minutes__isnull=True).aggregate(
            avg=Avg("resolution_time_minutes")
        )["avg"]

        # --- Datos para gráficos ---------------------------------------
        by_priority = list(
            tickets.values("priority__name").annotate(total=Count("id")).order_by("priority__name")
        )
        by_category = list(
            tickets.exclude(category__isnull=True)
            .values("category__name")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        by_technician = list(
            tickets.exclude(technician__isnull=True)
            .values("technician__name")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        by_status_chart = list(
            tickets.values("status__name").annotate(total=Count("id")).order_by("status__name")
        )
        # Incidentes vs. solicitudes de servicio (clasificación ITIL del ticket).
        by_type = list(
            tickets.values("ticket_type").annotate(total=Count("id")).order_by("ticket_type")
        )

        # Tickets creados en los últimos 30 días, agrupados por fecha.
        since = timezone.now() - timezone.timedelta(days=30)
        created_over_time_qs = (
            tickets.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )

        return Response(
            {
                "kpis": {
                    "total_tickets": total,
                    "open_tickets": by_status_counts["open"] + by_status_counts["assigned"],
                    "in_progress_tickets": by_status_counts["in_progress"] + by_status_counts["on_hold"],
                    "resolved_tickets": by_status_counts["resolved"],
                    "closed_tickets": by_status_counts["closed"],
                    "overdue_tickets": overdue,
                    "due_soon_tickets": due_soon,
                    "sla_compliance_pct": sla_compliance_pct,
                    "avg_response_time_minutes": round(avg_response, 1) if avg_response else None,
                    "avg_resolution_time_minutes": round(avg_resolution, 1) if avg_resolution else None,
                },
                "charts": {
                    "tickets_by_status": by_status_chart,
                    "tickets_by_priority": by_priority,
                    "tickets_by_category": by_category,
                    "tickets_by_technician": by_technician,
                    "tickets_by_type": by_type,
                    "tickets_created_over_time": list(created_over_time_qs),
                },
            }
        )
