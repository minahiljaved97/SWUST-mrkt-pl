import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canFavoriteListing, patchListingFavorite } from "../lib/favorites.ts";
import type { Listing } from "../types/marketplace.ts";

const baseListing = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Test",
  price: "10.00",
  condition: "GOOD",
  transaction_type: "SELL",
  status: "ACTIVE",
  location: "Campus",
  category: {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Textbooks",
    slug: "textbooks",
    description: "",
    icon: null,
    is_active: true,
    sort_order: 1,
  },
  seller: {
    id: "33333333-3333-3333-3333-333333333333",
    first_name: "A",
    last_name: "B",
    campus_location: "",
  },
  primary_image: null,
  is_favorited: false,
  favorite_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as Listing;

describe("favorites helpers", () => {
  it("patches favorite flags optimistically", () => {
    const next = patchListingFavorite(baseListing, true, "fav-1");
    assert.equal(next.is_favorited, true);
    assert.equal(next.favorite_id, "fav-1");
    assert.equal(baseListing.is_favorited, false);
  });

  it("requires login before favoriting", () => {
    const result = canFavoriteListing({
      isAuthenticated: false,
      isOwner: false,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "login_required");
  });

  it("blocks favoriting own listings", () => {
    const result = canFavoriteListing({
      isAuthenticated: true,
      isOwner: true,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "own_listing");
  });

  it("allows students to favorite other listings", () => {
    const result = canFavoriteListing({
      isAuthenticated: true,
      isOwner: false,
    });
    assert.equal(result.allowed, true);
  });
});
