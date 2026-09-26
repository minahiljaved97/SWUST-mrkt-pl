"""Shared OpenAPI / drf-spectacular helpers for accurate API docs."""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse
from rest_framework import serializers


class ErrorResponseSerializer(serializers.Serializer):
    detail = serializers.CharField(help_text="Human-readable error summary.")
    errors = serializers.DictField(
        child=serializers.JSONField(),
        required=False,
        help_text="Optional field-level validation errors.",
    )
    code = serializers.CharField(required=False)


class MessageDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


ERROR_400 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Validation failed or bad request.",
)
ERROR_401 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Authentication credentials were not provided or are invalid.",
)
ERROR_403 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Authenticated but not permitted for this action.",
)
ERROR_404 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Resource not found or not visible to the caller.",
)
ERROR_429 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Rate limit exceeded.",
)

COMMON_ERROR_RESPONSES = {
    400: ERROR_400,
    401: ERROR_401,
    403: ERROR_403,
    404: ERROR_404,
    429: ERROR_429,
}

AUTH_ERRORS = {
    400: ERROR_400,
    401: ERROR_401,
    429: ERROR_429,
}

UUID_ID = OpenApiParameter(
    name="id",
    type=OpenApiTypes.UUID,
    location=OpenApiParameter.PATH,
    description="Resource UUID.",
)

PAGE_PARAMS = [
    OpenApiParameter(
        name="page",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        description="Page number (1-based).",
    ),
    OpenApiParameter(
        name="page_size",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        description="Results per page (max 50).",
    ),
]

SEARCH_PARAM = OpenApiParameter(
    name="search",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    description="Full-text search term.",
)

ORDERING_PARAM = OpenApiParameter(
    name="ordering",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    description="Ordering field. Prefix with `-` for descending.",
)

BEARER_SECURITY = [{"bearerAuth": []}]

JWT_LOGIN_EXAMPLE = OpenApiExample(
    "Login success",
    value={
        "access": "<jwt-access-token>",
        "refresh": "<jwt-refresh-token>",
        "user": {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "student@swust.edu.cn",
            "first_name": "Wei",
            "last_name": "Zhang",
            "role": "STUDENT",
            "is_active": True,
        },
    },
    response_only=True,
)
