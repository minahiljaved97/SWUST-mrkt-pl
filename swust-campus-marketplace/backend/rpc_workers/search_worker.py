"""Independent XML-RPC search service for public Marketplace listings.

For the local coursework demonstration it listens only on 127.0.0.1.
Run from backend/: py -m rpc_workers.search_worker --port 8003
"""

import argparse
from xmlrpc.server import SimpleXMLRPCServer


def search_listings(records, query):
    """Return IDs of records whose title/description contains query (case-insensitive).

    `records` contains only public ACTIVE listing IDs, titles and descriptions.
    No database credentials or user profiles are sent to this worker.
    """
    if not isinstance(records, list) or not isinstance(query, str):
        raise ValueError("Expected a list of listing records and a search string")
    needle = query.casefold().strip()
    ids = []
    for item in records:
        if not isinstance(item, dict):
            raise ValueError("Each listing must be a dictionary")
        listing_id = item.get("id")
        if not isinstance(listing_id, str):
            raise ValueError("Each listing must have a string ID")
        title = (item.get("title") or "").casefold()
        description = (item.get("description") or "").casefold()
        if not needle or needle in title or needle in description:
            ids.append(listing_id)

    print(
        f"[RPC SEARCH] received={len(records)} matching={len(ids)} "
        f"query_length={len(needle)}",
        flush=True,
    )
    return {"ids": ids, "checked": len(records)}


def main():
    parser = argparse.ArgumentParser(description="SWUST Marketplace XML-RPC Search Worker")
    parser.add_argument("--host", default="127.0.0.1", help="Bind to local loopback by default")
    parser.add_argument("--port", type=int, default=8003)
    args = parser.parse_args()

    with SimpleXMLRPCServer(
        (args.host, args.port),
        allow_none=True,
        logRequests=True,
    ) as server:
        server.register_introspection_functions()
        server.register_function(search_listings, "search_listings")
        print(
            f"[RPC SEARCH] worker listening at http://{args.host}:{args.port}/RPC2",
            flush=True,
        )
        server.serve_forever()


if __name__ == "__main__":
    main()
