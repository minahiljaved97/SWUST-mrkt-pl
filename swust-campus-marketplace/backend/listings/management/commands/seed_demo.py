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

DEMO_USERS = [
    {
        "email": "admin@swust.edu.cn",
        "password": "admin",
        "first_name": "Admin",
        "last_name": "User",
        "role": UserRole.ADMIN,
        "student_id": "ADMIN001",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "email": "student@swust.edu.cn",
        "password": "student",
        "first_name": "Alex",
        "last_name": "Chen",
        "role": UserRole.STUDENT,
        "student_id": "S2024001",
        "is_staff": False,
        "is_superuser": False,
    },
    {
        "email": "buyer@swust.edu.cn",
        "password": "buyer",
        "first_name": "Sam",
        "last_name": "Li",
        "role": UserRole.STUDENT,
        "student_id": "S2024002",
        "is_staff": False,
        "is_superuser": False,
    },
]

DEMO_LISTINGS = [
    {
        "email": "student@swust.edu.cn",
        "title": "Calculus textbook (3rd edition)",
        "description": "Used calculus book for first-year courses. No missing pages.",
        "category_slug": "textbooks",
        "price": "45.00",
        "condition": ListingCondition.GOOD,
        "transaction_type": TransactionType.SELL,
        "location": "Qingyi Library",
    },
    {
        "email": "student@swust.edu.cn",
        "title": "Campus bicycle",
        "description": "Sturdy bike you can borrow for a week. Helmet included.",
        "category_slug": "bicycles",
        "price": "0.00",
        "condition": ListingCondition.FAIR,
        "transaction_type": TransactionType.BORROW,
        "location": "West gate bike rack",
    },
    {
        "email": "student@swust.edu.cn",
        "title": "USB-C hub exchange",
        "description": "Want to trade a 7-in-1 USB-C hub for a portable monitor stand.",
        "category_slug": "electronics",
        "price": "0.00",
        "condition": ListingCondition.LIKE_NEW,
        "transaction_type": TransactionType.EXCHANGE,
        "location": "Innovation building lobby",
        "preferred_exchange_item": "Monitor stand",
        "exchange_description": "Compact laptop/monitor stand in good condition.",
    },
    {
        "email": "student@swust.edu.cn",
        "title": "Folding study desk",
        "description": "Compact folding desk for dorm rooms.",
        "category_slug": "furniture",
        "price": "120.00",
        "condition": ListingCondition.GOOD,
        "transaction_type": TransactionType.SELL,
        "location": "Dormitory area C",
    },
    {
        "email": "student@swust.edu.cn",
        "title": "Desk lamp and stationery",
        "description": "LED desk lamp with unused notebooks and pens.",
        "category_slug": "other-student-items",
        "price": "35.00",
        "condition": ListingCondition.NEW,
        "transaction_type": TransactionType.SELL,
        "location": "Student center",
    },
]


class Command(BaseCommand):
    help = "Seed demo users and listings"

    def handle(self, *args, **options):
        users_by_email = {}
        for item in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=item["email"],
                defaults={
                    "first_name": item["first_name"],
                    "last_name": item["last_name"],
                    "role": item["role"],
                    "is_active": True,
                    "is_staff": item["is_staff"],
                    "is_superuser": item["is_superuser"],
                },
            )
            user.first_name = item["first_name"]
            user.last_name = item["last_name"]
            user.role = item["role"]
            user.is_active = True
            user.is_staff = item["is_staff"]
            user.is_superuser = item["is_superuser"]
            user.set_password(item["password"])
            user.save()
            Profile.objects.update_or_create(
                user=user,
                defaults={
                    "student_id": item["student_id"],
                    "campus_location": "Qingyi Campus",
                },
            )
            users_by_email[item["email"]] = user
            action = "created" if created else "updated"
            self.stdout.write(f"  {action} {item['email']} / {item['password']} ({item['role']})")

        created_listings = 0
        for item in DEMO_LISTINGS:
            category = Category.objects.get(slug=item["category_slug"])
            seller = users_by_email[item["email"]]
            _, was_created = Listing.objects.get_or_create(
                seller=seller,
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
                created_listings += 1

        self.stdout.write(self.style.SUCCESS(
            f"Demo ready. New listings: {created_listings}."
        ))
        self.stdout.write("Logins:")
        self.stdout.write("  admin@swust.edu.cn / admin")
        self.stdout.write("  student@swust.edu.cn / student")
        self.stdout.write("  buyer@swust.edu.cn / buyer")
