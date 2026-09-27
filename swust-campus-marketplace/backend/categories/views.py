from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from config.openapi import COMMON_ERROR_RESPONSES, PAGE_PARAMS, SEARCH_PARAM

from .models import Category
from .serializers import CategorySerializer


@extend_schema_view(
    list=extend_schema(
        tags=["Categories"],
        summary="List active categories",
        parameters=[*PAGE_PARAMS, SEARCH_PARAM],
        responses={200: CategorySerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Categories"],
        summary="Retrieve category by slug",
        responses={200: CategorySerializer, **COMMON_ERROR_RESPONSES},
    ),
)
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    lookup_field = "slug"
    search_fields = ("name", "description")
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        return Category.objects.filter(is_active=True)
