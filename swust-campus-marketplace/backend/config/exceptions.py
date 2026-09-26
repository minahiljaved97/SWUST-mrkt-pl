import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Normalize DRF errors; log and return JSON for unexpected failures."""
    response = drf_exception_handler(exc, context)
    if response is None:
        view = context.get("view")
        view_name = view.__class__.__name__ if view is not None else "unknown"
        logger.exception("Unhandled API exception in %s", view_name, exc_info=exc)
        return Response(
            {"detail": "Internal server error.", "errors": {}},
            status=500,
        )

    data = response.data
    if isinstance(data, dict) and set(data.keys()) <= {"detail", "code"}:
        payload = {"detail": data.get("detail"), "errors": {}}
        if "code" in data:
            payload["code"] = data["code"]
        response.data = payload
    elif isinstance(data, dict):
        response.data = {
            "detail": (
                "Validation failed."
                if response.status_code == 400
                else "Request failed."
            ),
            "errors": data,
        }
    elif isinstance(data, list):
        response.data = {
            "detail": "Request failed.",
            "errors": {"non_field_errors": data},
        }
    return response
