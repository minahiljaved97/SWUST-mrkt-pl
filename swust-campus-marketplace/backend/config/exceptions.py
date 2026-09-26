from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return response

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
