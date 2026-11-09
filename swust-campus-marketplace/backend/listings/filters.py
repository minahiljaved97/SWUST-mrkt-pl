import uuid
"""Marketplace filters with optional XML-RPC search in local development.

The normal authenticated Marketplace listing search uses a separate RPC worker.
For privacy, only public ACTIVE listing IDs/titles/descriptions are sent.
Other views/statuses keep the original Django filtering behavior.
"""

import logging
from xmlrpc.client import Error as RpcError
from xmlrpc.client import ServerProxy, Transport

from django.conf import settings
from django.db.models import Q
from django_filters import rest_framework as filters

from .models import Listing, ListingCondition, ListingStatus, TransactionType

logger = logging.getLogger(__name__)


class _TimeoutTransport(Transport):
    """Ensure a missing search server cannot hang a page request indefinitely."""

    def make_connection(self, host):
        conn = super().make_connection(host)
        conn.timeout = 3
        return conn


def _remote_search_ids(queryset, value):
    """Send small batches of public listing fields to the independent RPC server."""
    url = getattr(settings, "LISTING_SEARCH_RPC_URL", "http://127.0.0.1:8003/RPC2")
    matched_ids = []
    candidates = 0

    with ServerProxy(url, allow_none=True, transport=_TimeoutTransport()) as client:
        rows = queryset.filter(status=ListingStatus.ACTIVE).values_list(
            "id", "title", "description"
        ).iterator(chunk_size=200)

        batch = []
        for listing_id, title, description in rows:
            batch.append({
                "id": str(listing_id),
                "title": title or "",
                "description": description or "",
            })
            if len(batch) == 200:
                reply = client.search_listings(batch, value)
                if not isinstance(reply, dict) or not isinstance(reply.get("ids"), list):
                    raise ValueError("Unexpected RPC search response")
                matched_ids.extend(reply["ids"])
                candidates += len(batch)
                batch = []

        if batch:
            reply = client.search_listings(batch, value)
            if not isinstance(reply, dict) or not isinstance(reply.get("ids"), list):
                raise ValueError("Unexpected RPC search response")
            matched_ids.extend(reply["ids"])
            candidates += len(batch)

    logger.info("Marketplace XML-RPC search: candidates=%d matches=%d", candidates, len(matched_ids))
    return matched_ids


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

        local_result = lambda: queryset.filter(  # noqa: E731
            Q(title__icontains=value) | Q(description__icontains=value)
        )

        # Keep private/owner/status-specific searches on Django, preserving access
        # control and behavior. The RPC worker sees only public ACTIVE records.
        request = self.request
        view = (getattr(request, "parser_context", None) or {}).get("view")
        params = getattr(request, "query_params", {})
        is_public_list = (
            getattr(view, "action", None) == "list"
            and params.get("mine") != "1"
            and not params.get("status")
        )

        # Enabled in local development by default; production remains unchanged.
        enabled = getattr(settings, "LISTING_SEARCH_RPC_ENABLED", settings.DEBUG)
        if not enabled or not is_public_list:
            return local_result()

        try:
            ids = _remote_search_ids(queryset, value)
        except (OSError, RpcError, ValueError) as exc:
            logger.warning("XML-RPC search unavailable; using original Django search: %s", exc)
            return local_result()

        # Filtering by ID at Django again preserves original ordering, pagination,
        # other filters, and prevents the RPC service from exposing hidden listings.
        return queryset.filter(status=ListingStatus.ACTIVE, pk__in=ids)

    def filter_category(self, queryset, name, value):
     if not value:
        return queryset

     try:
        category_uuid = uuid.UUID(str(value))
     except (ValueError, TypeError, AttributeError):
        return queryset.filter(category__slug=value)

     return queryset.filter(
        Q(category__slug=value) | Q(category_id=category_uuid)
    )
