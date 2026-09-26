from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import Profile, UserRole
from categories.models import Category
from listings.models import (
    Listing,
    ListingCondition,
    ListingStatus,
    TransactionType,
)

User = get_user_model()

DEMO_LISTINGS = [
    {
        "email": "seller.demo@swust.edu.cn",
        "student_id": "DEMOSELL01",
        "first_name": "Demo",
        "last_name": "Seller",
        "title": "Calculus textbook (3rd edition)",
        "description": "Clean used calculus textbook for first-year courses. No missing pages.",
        "category_slug": "textbooks",
        "price": "45.00",
        "condition": ListingCondition.GOOD,
        "transaction_type": TransactionType.SELL,
        "location": "Qingyi Library",
    },
    {
        "email": "seller.demo@swust.edu.cn",
        "student_id": "DEMOSELL01",
        "first_name": "Demo",
        "last_name": "Seller",
        "title": "Campus bicycle (shared use)",
        "description": "Sturdy bike available to borrow for a week. Helmet included.",
        "category_slug": "bicycles",
        "price": "0.00",
        "condition": ListingCondition.FAIR,
        "transaction_type": TransactionType.BORROW,
        "location": "West gate bike rack",
    },
    {
        "email": "seller.demo@swust.edu.cn",
        "student_id": "DEMOSELL01",
        "first_name": "Demo",
        "last_name": "Seller",
        "title": "USB-C hub exchange",
        "description": "Looking to exchange a 7-in-1 USB-C hub for a portable monitor stand.",
        "category_slug": "electronics",
        "price": "0.00",
        "condition": ListingCondition.LIKE_NEW,
        "transaction_type": TransactionType.EXCHANGE,
        "location": "Innovation building lobby",
        "preferred_exchange_item": "Monitor stand",
        "exchange_description": "Prefer a compact laptop/monitor stand in good condition.",
    },
    {
        "email": "seller.demo@swust.edu.cn",
        "student_id": "DEMOSELL01",
        "first_name": "Demo",
        "last_name": "Seller",
        "title": "Folding study desk",
        "description": "Compact folding desk suitable for dorm rooms.",
        "category_slug": "furniture",
        "price": "120.00",
        "condition": ListingCondition.GOOD,
        "transaction_type": TransactionType.SELL,
        "location": "Dormitory area C",
    },
    {
        "email": "seller.demo@swust.edu.cn",
        "student_id": "DEMOSELL01",
        "first_name": "Demo",
        "last_name": "Seller",
        "title": "Desk lamp and stationery set",
        "description": "LED desk lamp with unused notebooks and pens.",
        "category_slug": "other-student-items",
        "price": "35.00",
        "condition": ListingCondition.NEW,
        "transaction_type": TransactionType.SELL,
        "location": "Student center",
    },
]


class Command(BaseCommand):
    help = "Seed demo marketplace listings for local development."

    def handle(self, *args, **options):
        created = 0
        for item in DEMO_LISTINGS:
            user, user_created = User.objects.get_or_create(
                email=item["email"],
                defaults={
                    "first_name": item["first_name"],
                    "last_name": item["last_name"],
                    "role": UserRole.STUDENT,
                    "is_active": True,
                },
            )
            if user_created:
                user.set_password("DemoPass123!")
                user.save()
            Profile.objects.get_or_create(
                user=user,
                defaults={
                    "student_id": item["student_id"],
                    "campus_location": "Qingyi Campus",
                },
            )
            category = Category.objects.get(slug=item["category_slug"])
            listing, was_created = Listing.objects.get_or_create(
                seller=user,
                title=item["title"],
                defaults={
                    "category": category,
                    "description": item["description"],
                    "price": Decimal(item["price"]),
                    "condition": item["condition"],
                    "transaction_type": item["transaction_type"],
                    "status": ListingStatus.ACTIVE,
                    "location": item["location"],
                    "preferred_exchange_item": item.get("preferred_exchange_item", ""),
                    "exchange_description": item.get("exchange_description", ""),
                },
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(f"Demo listings ready. Newly created: {created}.")
        )
