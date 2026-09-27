from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse
from rest_framework import serializers


class ErrorResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    errors = serializers.DictField(
        child=serializers.JSONField(),
        required=False,
    )
    code = serializers.CharField(required=False)


class MessageDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


ERROR_400 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Bad request.",
)
ERROR_401 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Unauthenticated.",
)
ERROR_403 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Forbidden.",
)
ERROR_404 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Not found.",
)
ERROR_429 = OpenApiResponse(
    response=ErrorResponseSerializer,
    description="Throttled.",
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
)

PAGE_PARAMS = [
    OpenApiParameter(
        name="page",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
    ),
    OpenApiParameter(
        name="page_size",
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
    ),
]

SEARCH_PARAM = OpenApiParameter(
    name="search",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
)

ORDERING_PARAM = OpenApiParameter(
    name="ordering",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    description="Prefix with `-` for descending.",
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
