from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile, User, UserRole
from categories.models import Category
from listings.models import (
    Listing,
    ListingCondition,
    ListingStatus,
    TransactionType,
)
from messaging.models import Conversation, Message


class MessagingAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="electronics",
            defaults={
                "name": "Electronics",
                "description": "Gadgets",
                "sort_order": 2,
            },
        )
        self.seller = User.objects.create_user(
            email="seller.msg@swust.edu.cn",
            password="Pass12345!",
            first_name="Sell",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.seller, student_id="MSGSELL01")
        self.buyer = User.objects.create_user(
            email="buyer.msg@swust.edu.cn",
            password="Pass12345!",
            first_name="Buy",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.buyer, student_id="MSGBUY01")
        self.outsider = User.objects.create_user(
            email="outsider.msg@swust.edu.cn",
            password="Pass12345!",
            first_name="Out",
            last_name="Sider",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.outsider, student_id="MSGOUT01")
        self.admin = User.objects.create_user(
            email="admin.msg@swust.edu.cn",
            password="Pass12345!",
            first_name="Ad",
            last_name="Min",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="MSGADMIN01")
        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Used calculator",
            description="Scientific calculator for messaging tests.",
            price=Decimal("45.00"),
            condition=ListingCondition.GOOD,
            transaction_type=TransactionType.SELL,
            status=ListingStatus.ACTIVE,
            location="East Campus",
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def test_buyer_can_start_conversation(self):
        self._login(self.buyer)
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {"listing": str(self.listing.id), "content": "Is this still available?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["buyer"]["id"], str(self.buyer.id))
        self.assertEqual(response.data["seller"]["id"], str(self.seller.id))
        self.assertEqual(len(response.data["messages"]), 1)

    def test_duplicate_conversation_returns_existing(self):
        conversation = Conversation.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            seller=self.seller,
        )
        self._login(self.buyer)
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.post(
            url, {"listing": str(self.listing.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(conversation.id))

    def test_seller_cannot_message_self(self):
        self._login(self.seller)
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.post(
            url, {"listing": str(self.listing.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_participants_can_list_and_retrieve(self):
        conversation = Conversation.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            seller=self.seller,
        )
        Message.objects.create(
            conversation=conversation,
            sender=self.buyer,
            content="Hello seller",
        )
        self._login(self.seller)
        list_url = reverse("api:conversation-list", kwargs={"version": "v1"})
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = list_response.data.get("results", list_response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["unread_count"], 1)

        detail_url = reverse(
            "api:conversation-detail",
            kwargs={"version": "v1", "id": conversation.id},
        )
        detail_response = self.client.get(detail_url)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_response.data["messages"]), 1)

    def test_outsider_cannot_access_conversation(self):
        conversation = Conversation.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            seller=self.seller,
        )
        message = Message.objects.create(
            conversation=conversation,
            sender=self.buyer,
            content="Private note",
        )
        self._login(self.outsider)

        detail_url = reverse(
            "api:conversation-detail",
            kwargs={"version": "v1", "id": conversation.id},
        )
        self.assertEqual(
            self.client.get(detail_url).status_code, status.HTTP_404_NOT_FOUND
        )

        messages_url = reverse(
            "api:conversation-create-message",
            kwargs={"version": "v1", "id": conversation.id},
        )
        self.assertEqual(
            self.client.post(
                messages_url, {"content": "Hi"}, format="json"
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        read_url = reverse(
            "api:message-read",
            kwargs={"version": "v1", "id": message.id},
        )
        self.assertEqual(
            self.client.patch(read_url).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        list_url = reverse("api:conversation-list", kwargs={"version": "v1"})
        list_response = self.client.get(list_url)
        results = list_response.data.get("results", list_response.data)
        self.assertEqual(len(results), 0)

    def test_send_and_mark_message_read(self):
        conversation = Conversation.objects.create(
            listing=self.listing,
            buyer=self.buyer,
            seller=self.seller,
        )
        self._login(self.buyer)
        messages_url = reverse(
            "api:conversation-create-message",
            kwargs={"version": "v1", "id": conversation.id},
        )
        send_response = self.client.post(
            messages_url, {"content": "Still interested"}, format="json"
        )
        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        message_id = send_response.data["id"]

        self._login(self.seller)
        read_url = reverse(
            "api:message-read",
            kwargs={"version": "v1", "id": message_id},
        )
        read_response = self.client.patch(read_url)
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertTrue(read_response.data["is_read"])

        self._login(self.buyer)
        own_read = self.client.patch(read_url)
        self.assertEqual(own_read.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_use_student_messaging(self):
        self._login(self.admin)
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.post(
            url, {"listing": str(self.listing.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_forbidden(self):
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_start_conversation_on_removed_listing(self):
        self.listing.status = ListingStatus.REMOVED
        self.listing.save(update_fields=["status"])
        self._login(self.buyer)
        url = reverse("api:conversation-list", kwargs={"version": "v1"})
        response = self.client.post(
            url, {"listing": str(self.listing.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
