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
from reports.models import Report, ReportReason, ReportStatus


class AdminDashboardAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="textbooks",
            defaults={
                "name": "Textbooks",
                "description": "Books",
                "sort_order": 1,
                "is_active": True,
            },
        )
        self.admin = User.objects.create_user(
            email="admin.dash@swust.edu.cn",
            password="Pass12345!",
            first_name="Ad",
            last_name="Min",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="DASHADMIN01")
        self.student = User.objects.create_user(
            email="student.dash@swust.edu.cn",
            password="Pass12345!",
            first_name="Stu",
            last_name="Dent",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.student, student_id="DASHSTUD01")
        self.other = User.objects.create_user(
            email="other.dash@swust.edu.cn",
            password="Pass12345!",
            first_name="Oth",
            last_name="Er",
            role=UserRole.STUDENT,
            is_active=True,
        )
        Profile.objects.create(user=self.other, student_id="DASHOTHER01")
        self.listing = Listing.objects.create(
            seller=self.student,
            category=self.category,
            title="Admin dashboard textbook",
            description="Used for admin dashboard tests.",
            price=Decimal("15.00"),
            condition=ListingCondition.GOOD,
            transaction_type=TransactionType.SELL,
            status=ListingStatus.ACTIVE,
            location="Library",
        )
        self.report = Report.objects.create(
            reporter=self.other,
            listing=self.listing,
            reason=ReportReason.SPAM,
            status=ReportStatus.PENDING,
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def _assert_student_forbidden(self, method, url, **kwargs):
        self._login(self.student)
        response = getattr(self.client, method)(url, **kwargs)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_summary_admin_only(self):
        url = reverse("api:admin-dashboard-summary", kwargs={"version": "v1"})
        self._assert_student_forbidden("get", url)
        self._login(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_students"], 2)
        self.assertEqual(response.data["active_listings"], 1)
        self.assertEqual(response.data["pending_reports"], 1)

    def test_statistics_admin_only(self):
        url = reverse("api:admin-dashboard-statistics", kwargs={"version": "v1"})
        self._assert_student_forbidden("get", url)
        self._login(self.admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("listings_by_category", response.data)
        self.assertIn("listings_by_transaction_type", response.data)
        self.assertIn("listing_status_distribution", response.data)
        self.assertIn("listings_created_over_time", response.data)

    def test_users_list_search_and_deactivate(self):
        list_url = reverse("api:admin-user-list", kwargs={"version": "v1"})
        self._assert_student_forbidden("get", list_url)

        self._login(self.admin)
        listed = self.client.get(list_url, {"search": "student.dash"})
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        results = listed.data.get("results", listed.data)
        self.assertTrue(any(row["email"] == self.student.email for row in results))
        self.assertNotIn("phone", results[0])

        detail_url = reverse(
            "api:admin-user-detail",
            kwargs={"version": "v1", "id": self.other.id},
        )
        patched = self.client.patch(detail_url, {"is_active": False}, format="json")
        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.other.refresh_from_db()
        self.assertFalse(self.other.is_active)

        listings_url = reverse(
            "api:admin-user-listings",
            kwargs={"version": "v1", "id": self.student.id},
        )
        student_listings = self.client.get(listings_url)
        self.assertEqual(student_listings.status_code, status.HTTP_200_OK)
        listing_results = student_listings.data.get(
            "results", student_listings.data
        )
        self.assertEqual(len(listing_results), 1)

    def test_listings_remove_and_restore(self):
        list_url = reverse("api:admin-listing-list", kwargs={"version": "v1"})
        self._assert_student_forbidden("get", list_url)

        self._login(self.admin)
        detail_url = reverse(
            "api:admin-listing-detail",
            kwargs={"version": "v1", "id": self.listing.id},
        )
        removed = self.client.patch(detail_url, {"remove": True}, format="json")
        self.assertEqual(removed.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, ListingStatus.REMOVED)

        restored = self.client.patch(detail_url, {"restore": True}, format="json")
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, ListingStatus.ACTIVE)

    def test_categories_crud_and_permissions(self):
        list_url = reverse("api:admin-category-list", kwargs={"version": "v1"})
        self._assert_student_forbidden("get", list_url)
        self._assert_student_forbidden(
            "post", list_url, data={"name": "Hack"}, format="json"
        )

        self._login(self.admin)
        created = self.client.post(
            list_url,
            {
                "name": "Lab Gear",
                "description": "Equipment",
                "sort_order": 9,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        category_id = created.data["id"]

        detail_url = reverse(
            "api:admin-category-detail",
            kwargs={"version": "v1", "id": category_id},
        )
        deactivated = self.client.patch(
            detail_url, {"is_active": False}, format="json"
        )
        self.assertEqual(deactivated.status_code, status.HTTP_200_OK)
        self.assertFalse(deactivated.data["is_active"])

        reactivated = self.client.patch(
            detail_url, {"is_active": True}, format="json"
        )
        self.assertEqual(reactivated.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivated.data["is_active"])

    def test_unauthenticated_forbidden_on_admin_endpoints(self):
        endpoints = [
            reverse("api:admin-dashboard-summary", kwargs={"version": "v1"}),
            reverse("api:admin-dashboard-statistics", kwargs={"version": "v1"}),
            reverse("api:admin-user-list", kwargs={"version": "v1"}),
            reverse("api:admin-listing-list", kwargs={"version": "v1"}),
            reverse("api:admin-category-list", kwargs={"version": "v1"}),
        ]
        for url in endpoints:
            response = self.client.get(url)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                msg=url,
            )
