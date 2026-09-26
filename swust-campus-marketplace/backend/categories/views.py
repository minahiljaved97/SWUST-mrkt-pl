from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Category
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    lookup_field = "slug"
    search_fields = ("name", "description")
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        return Category.objects.filter(is_active=True)
