from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Report
from .serializers import ReportCreateSerializer


class ReportViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportCreateSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).select_related(
            "listing", "reported_user"
        )
