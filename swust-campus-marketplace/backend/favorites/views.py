from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsOwner

from .models import Favorite
from .serializers import FavoriteSerializer


class FavoriteViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = FavoriteSerializer
    lookup_field = "id"

    def get_queryset(self):
        return (
            Favorite.objects.filter(user=self.request.user)
            .select_related(
                "listing",
                "listing__category",
                "listing__seller",
                "listing__seller__profile",
            )
            .prefetch_related("listing__images")
        )
