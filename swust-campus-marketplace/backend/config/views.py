from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import serializers


class HealthResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    api = serializers.CharField()


@extend_schema(
    tags=["Health"],
    summary="Health check",
    description="Public. Returns API version readiness. No authentication required.",
    responses={200: HealthResponseSerializer},
    auth=[],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request: Request, **kwargs) -> Response:
    return Response({"status": "ok", "api": kwargs.get("version", "v1")})
