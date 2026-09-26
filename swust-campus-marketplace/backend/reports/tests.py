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


class ReportingAPITests(APITestCase):
    def setUp(self):
        self.category, _ = Category.objects.get_or_create(
            slug="furniture",
            defaults={
                "name": "Furniture",
                "description": "Campus furniture",
                "sort_order": 3,
            },
        )
        self.seller = User.objects.create_user(
            email="seller.rep@swust.edu.cn",
            password="Pass12345!",
            first_name="Sell",
            last_name="Er",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.seller, student_id="REPSELL01")
        self.student = User.objects.create_user(
            email="student.rep@swust.edu.cn",
            password="Pass12345!",
            first_name="Stu",
            last_name="Dent",
            role=UserRole.STUDENT,
        )
        Profile.objects.create(user=self.student, student_id="REPSTUD01")
        self.admin = User.objects.create_user(
            email="admin.rep@swust.edu.cn",
            password="Pass12345!",
            first_name="Ad",
            last_name="Min",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        Profile.objects.create(user=self.admin, student_id="REPADMIN01")
        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            title="Desk lamp",
            description="Bright desk lamp for reports tests.",
            price=Decimal("30.00"),
            condition=ListingCondition.GOOD,
            transaction_type=TransactionType.SELL,
            status=ListingStatus.ACTIVE,
            location="West Dorm",
        )

    def _login(self, user):
        self.client.force_authenticate(user=user)

    def test_student_can_report_listing(self):
        self._login(self.student)
        url = reverse("api:report-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {
                "listing": str(self.listing.id),
                "reason": ReportReason.SPAM,
                "description": "Looks fake",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["detail"],
            "Thank you. Your report has been received.",
        )
        self.assertNotIn("admin_notes", response.data)
        self.assertNotIn("status", response.data)
        self.assertTrue(
            Report.objects.filter(
                reporter=self.student, listing=self.listing
            ).exists()
        )

    def test_student_can_report_user(self):
        self._login(self.student)
        url = reverse("api:report-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {
                "reported_user": str(self.seller.id),
                "reason": ReportReason.FRAUD,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_report_self_or_own_listing(self):
        self._login(self.seller)
        url = reverse("api:report-list", kwargs={"version": "v1"})
        own_listing = self.client.post(
            url,
            {"listing": str(self.listing.id), "reason": ReportReason.OTHER},
            format="json",
        )
        self.assertEqual(own_listing.status_code, status.HTTP_400_BAD_REQUEST)

        self_user = self.client.post(
            url,
            {
                "reported_user": str(self.seller.id),
                "reason": ReportReason.OTHER,
            },
            format="json",
        )
        self.assertEqual(self_user.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_open_report_rejected(self):
        Report.objects.create(
            reporter=self.student,
            listing=self.listing,
            reason=ReportReason.SPAM,
            status=ReportStatus.PENDING,
        )
        self._login(self.student)
        url = reverse("api:report-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {"listing": str(self.listing.id), "reason": ReportReason.FRAUD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_access_admin_reports(self):
        report = Report.objects.create(
            reporter=self.student,
            listing=self.listing,
            reason=ReportReason.SPAM,
        )
        self._login(self.student)
        list_url = reverse("api:admin-report-list", kwargs={"version": "v1"})
        self.assertEqual(
            self.client.get(list_url).status_code, status.HTTP_403_FORBIDDEN
        )
        detail_url = reverse(
            "api:admin-report-detail",
            kwargs={"version": "v1", "id": report.id},
        )
        self.assertEqual(
            self.client.get(detail_url).status_code, status.HTTP_403_FORBIDDEN
        )

    def test_admin_can_list_retrieve_and_update_report(self):
        report = Report.objects.create(
            reporter=self.student,
            listing=self.listing,
            reason=ReportReason.INAPPROPRIATE_CONTENT,
            description="Offensive photo",
        )
        self._login(self.admin)
        list_url = reverse("api:admin-report-list", kwargs={"version": "v1"})
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = list_response.data.get("results", list_response.data)
        self.assertEqual(len(results), 1)
        self.assertIn("admin_notes", results[0])

        detail_url = reverse(
            "api:admin-report-detail",
            kwargs={"version": "v1", "id": report.id},
        )
        patch_response = self.client.patch(
            detail_url,
            {
                "status": ReportStatus.RESOLVED,
                "admin_notes": "Listing removed after review.",
                "remove_listing": True,
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["status"], ReportStatus.RESOLVED)
        self.assertEqual(
            patch_response.data["admin_notes"],
            "Listing removed after review.",
        )
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, ListingStatus.REMOVED)

    def test_unauthenticated_cannot_create_report(self):
        url = reverse("api:report-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {"listing": str(self.listing.id), "reason": ReportReason.SPAM},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_cannot_create_student_report(self):
        self._login(self.admin)
        url = reverse("api:report-list", kwargs={"version": "v1"})
        response = self.client.post(
            url,
            {"listing": str(self.listing.id), "reason": ReportReason.SPAM},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
