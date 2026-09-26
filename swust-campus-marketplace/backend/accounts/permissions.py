from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserRole


class IsAuthenticatedAndActive(BasePermission):
    message = "Authentication credentials were not provided or the account is inactive."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active)


class IsStudent(BasePermission):
    message = "Student role required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == UserRole.STUDENT
        )


class IsAdmin(BasePermission):
    message = "Administrator role required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (user.role == UserRole.ADMIN or user.is_superuser)
        )


class IsOwner(BasePermission):
    """
    Object-level ownership check.
    Supports User objects, models with `.user`, and listings with `.seller`.
    """

    message = "You do not have permission to modify this resource."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.role == UserRole.ADMIN or user.is_superuser:
            return True
        if obj == user:
            return True
        owner_id = getattr(obj, "user_id", None)
        if owner_id is not None:
            return owner_id == user.id
        seller_id = getattr(obj, "seller_id", None)
        if seller_id is not None:
            return seller_id == user.id
        return False


class IsOwnerOrReadOnly(IsOwner):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return super().has_object_permission(request, view, obj)
