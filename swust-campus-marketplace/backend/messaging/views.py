from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsStudent
from config.openapi import (
    COMMON_ERROR_RESPONSES,
    ERROR_400,
    ERROR_401,
    ERROR_403,
    ERROR_404,
    PAGE_PARAMS,
)

from .models import Conversation, Message
from .permissions import IsConversationParticipant
from .serializers import (
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)


@extend_schema_view(
    list=extend_schema(
        tags=["Conversations"],
        summary="List my conversations",
        description=(
            "Student only. Inbox for conversations where the caller is buyer or seller. "
            "Includes unread counts."
        ),
        parameters=PAGE_PARAMS,
        responses={200: ConversationListSerializer, **COMMON_ERROR_RESPONSES},
    ),
    retrieve=extend_schema(
        tags=["Conversations"],
        summary="Retrieve conversation thread",
        description="Student + participant only. Returns messages and listing reference.",
        responses={200: ConversationDetailSerializer, **COMMON_ERROR_RESPONSES},
    ),
    create=extend_schema(
        tags=["Conversations"],
        summary="Start or reopen conversation",
        description=(
            "Student only. Body: `{ listing, content? }`. Cannot message yourself. "
            "Returns 201 when created, 200 when an existing thread is reused."
        ),
        request=ConversationCreateSerializer,
        responses={
            200: ConversationDetailSerializer,
            201: ConversationDetailSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
        },
    ),
)
class ConversationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsStudent, IsConversationParticipant]
    lookup_field = "id"
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsStudent()]
        return [IsStudent(), IsConversationParticipant()]

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not getattr(
            user, "is_authenticated", False
        ):
            return Conversation.objects.none()
        queryset = (
            Conversation.objects.filter(Q(buyer=user) | Q(seller=user))
            .select_related(
                "listing",
                "listing__category",
                "listing__seller",
                "listing__seller__profile",
                "buyer",
                "buyer__profile",
                "seller",
                "seller__profile",
            )
            .prefetch_related("listing__images")
            .annotate(
                unread_count=Count(
                    "messages",
                    filter=Q(messages__is_read=False) & ~Q(messages__sender=user),
                    distinct=True,
                )
            )
            .order_by("-updated_at")
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                Prefetch(
                    "messages",
                    queryset=Message.objects.select_related(
                        "sender", "sender__profile"
                    ).order_by("created_at"),
                    to_attr="prefetched_messages",
                )
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ConversationCreateSerializer
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        created = serializer.context.get("created", True)
        detail = ConversationDetailSerializer(
            self.get_queryset().get(id=conversation.id),
            context=self.get_serializer_context(),
        )
        return Response(
            detail.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(
        tags=["Messages"],
        summary="Send message in conversation",
        description="Student + participant only. Body: `{ content }`.",
        request=MessageCreateSerializer,
        responses={
            201: MessageSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
            404: ERROR_404,
        },
    )
    @action(detail=True, methods=["post"], url_path="messages")
    def create_message(self, request, id=None, **kwargs):
        conversation = self.get_object()
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data["content"],
        )
        Conversation.objects.filter(id=conversation.id).update(
            updated_at=timezone.now()
        )
        return Response(
            MessageSerializer(message, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class MessageViewSet(viewsets.GenericViewSet):
    permission_classes = [IsStudent, IsConversationParticipant]
    lookup_field = "id"
    http_method_names = ["patch", "head", "options"]
    serializer_class = MessageSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(self, "swagger_fake_view", False) or not getattr(
            user, "is_authenticated", False
        ):
            return Message.objects.none()
        return Message.objects.filter(
            Q(conversation__buyer=user) | Q(conversation__seller=user)
        ).select_related(
            "conversation",
            "sender",
            "sender__profile",
        )

    @extend_schema(
        tags=["Messages"],
        summary="Mark message as read",
        description=(
            "Student + participant only. Cannot mark your own outgoing message as read."
        ),
        request=None,
        responses={
            200: MessageSerializer,
            400: ERROR_400,
            401: ERROR_401,
            403: ERROR_403,
            404: ERROR_404,
        },
    )
    @action(detail=True, methods=["patch"], url_path="read")
    def read(self, request, id=None, **kwargs):
        message = self.get_object()
        if message.sender_id == request.user.id:
            raise ValidationError(
                {"detail": "You cannot mark your own message as read."}
            )
        if not message.is_read:
            message.is_read = True
            message.save(update_fields=["is_read"])
        return Response(
            MessageSerializer(message, context=self.get_serializer_context()).data
        )
