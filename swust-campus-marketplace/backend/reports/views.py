from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsStudent
from config.openapi import (
    COMMON_ERROR_RESPONSES,
    ERROR_400,
    ERROR_401,
    ERROR_403,
    PAGE_PARAMS,
)

from .models import Report
from .serializers import (
    AdminReportSerializer,
    AdminReportUpdateSerializer,
    StudentReportCreateSerializer,
    StudentReportResponseSerializer,
)


@extend_schema_view(
    create=extend_schema(
        tags=["Reports"],
        summary="Submit a report",
        description=(
            "Student only. Body must include `listing` and/or `reported_user`, plus `reason`. "
            "Admin notes/status are never returned. Blocks self-reports and duplicate open reports."
        ),
        request=StudentReportCreateSerializer,
        responses={
            201: StudentReportResponseSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    ),
)
class ReportViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Student report submission: POST /reports/"""

    permission_classes = [IsStudent]
    http_method_names = ["post", "head", "options"]

    def get_queryset(self):
        return Report.objects.none()

    def get_serializer_class(self):
        return StudentReportCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        payload = StudentReportResponseSerializer(
            {
                "id": report.id,
                "detail": "Thank you. Your report has been received.",
            }
        ).data
        return Response(payload, status=status.HTTP_201_CREATED)


@extend_schema_view(
    list=extend_schema(
        tags=["Admin Reports"],
        summary="List reports (admin)",
        description="Admin only. Optional `status` filter: PENDING | REVIEWING | RESOLVED | DISMISSED.",
        parameters=[
            *PAGE_PARAMS,
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Report status filter.",
            ),
        ],
        responses={200: AdminReportSerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Admin Reports"],
        summary="Retrieve report (admin)",
        description="Admin only.",
        responses={200: AdminReportSerializer, **COMMON_ERROR_RESPONSES},
    ),
    partial_update=extend_schema(
        tags=["Admin Reports"],
        summary="Update report (admin)",
        description=(
            "Admin only. Body: `{ status?, admin_notes?, remove_listing? }`. "
            "Setting `remove_listing: true` soft-removes the linked listing."
        ),
        request=AdminReportUpdateSerializer,
        responses={200: AdminReportSerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class AdminReportViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET /admin/reports/
    GET /admin/reports/{id}/
    PATCH /admin/reports/{id}/
    """

    permission_classes = [IsAdmin]
    lookup_field = "id"
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = Report.objects.select_related(
            "reporter",
            "reporter__profile",
            "reported_user",
            "reported_user__profile",
            "listing",
            "listing__category",
            "listing__seller",
            "listing__seller__profile",
        ).prefetch_related("listing__images")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in {"partial_update", "update"}:
            return AdminReportUpdateSerializer
        return AdminReportSerializer

    def partial_update(self, request, *args, **kwargs):
        report = self.get_object()
        serializer = self.get_serializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            AdminReportSerializer(report, context=self.get_serializer_context()).data
        )
