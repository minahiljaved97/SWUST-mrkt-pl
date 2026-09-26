from rest_framework.permissions import BasePermission

from .models import Conversation, Message


class IsConversationParticipant(BasePermission):
    message = "Only conversation participants can access this resource."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if isinstance(obj, Conversation):
            return user.id in {obj.buyer_id, obj.seller_id}
        if isinstance(obj, Message):
            return user.id in {
                obj.conversation.buyer_id,
                obj.conversation.seller_id,
            }
        return False
