"""Anonymous feedback, shown only once a group is large enough to hide in.

Until K_ANONYMITY different people have answered at a site, it shows nothing: with
three people, a manager can often guess who wrote which. People are counted, not
answers, so one worker sending five replies cannot unlock the comments alone. Once
open, comments are decrypted, shuffled and returned without their week, so their
order says nothing about who wrote them.
"""

import random
from collections import defaultdict

from .crypto import Sealer
from .store import Feedback

K_ANONYMITY = 5


def summarize(entries: list[Feedback], site_id: str, sealer: Sealer, people: int) -> dict:
    """`people` is how many different workers have answered at this site."""
    entries = [e for e in entries if e.site_id == site_id]
    if people < K_ANONYMITY:
        return {"site_id": site_id, "responses": len(entries), "people": people, "hidden": True, "needed": K_ANONYMITY}

    by_topic: dict[str, list[int]] = defaultdict(list)
    for e in entries:
        by_topic[e.topic].append(e.rating)
    comments = [sealer.open(e.sealed_comment, site_id) for e in entries if e.sealed_comment]
    random.shuffle(comments)
    return {
        "site_id": site_id,
        "responses": len(entries),
        "people": people,
        "hidden": False,
        "average": round(sum(e.rating for e in entries) / len(entries), 1),
        "topics": {t: round(sum(r) / len(r), 1) for t, r in by_topic.items()},
        "comments": comments,
    }
