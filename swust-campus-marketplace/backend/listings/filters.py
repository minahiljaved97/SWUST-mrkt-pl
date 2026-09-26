from django.db.models import Q
from django_filters import rest_framework as filters

from .models import Listing, ListingCondition, ListingStatus, TransactionType


class ListingFilter(filters.FilterSet):
    search = filters.CharFilter(method="filter_search")
    category = filters.CharFilter(method="filter_category")
    transaction_type = filters.ChoiceFilter(choices=TransactionType.choices)
    condition = filters.ChoiceFilter(choices=ListingCondition.choices)
    status = filters.ChoiceFilter(choices=ListingStatus.choices)
    location = filters.CharFilter(field_name="location", lookup_expr="icontains")
    price_min = filters.NumberFilter(field_name="price", lookup_expr="gte")
    price_max = filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Listing
        fields = (
            "transaction_type",
            "condition",
            "status",
        )

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )

    def filter_category(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(category__slug=value) | Q(category_id=value)
        )
