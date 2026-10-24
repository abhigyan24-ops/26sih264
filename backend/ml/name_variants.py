"""
Name variant generator for resolver tuning and evaluation.
Generates realistic name variations (exact, abbr, upper, typo, trailing, drop_of, no_city)
and negative controls (unknown_name, other_city).
"""
import random

NEG_PREFIXES = [
    "Kalinga Valley", "Narmada Heritage", "Himalayan Crest", "Deccan Pioneer",
    "Saraswati Vidya", "Coastal Horizon", "Aravalli Summit", "Godavari Frontier",
]
TYPE_WORDS = [
    "Institute of Technology", "College of Engineering", "Engineering College",
    "Institute of Management", "College of Pharmacy",
]
ALL_CITIES = [
    "Pune", "Nagpur", "Bengaluru", "Mysuru", "Chennai", "Coimbatore",
    "Hyderabad", "Jaipur", "Lucknow", "Kanpur", "Bhopal", "Indore",
    "Kolkata", "Bhubaneswar", "Patna", "Ahmedabad", "Surat", "Chandigarh",
]


def _core(name: str, city: str | None) -> str:
    if "," in name:
        return name.rsplit(",", 1)[0].strip()
    if city and city in name:
        return name.replace(city, "").strip()
    return name.strip()


def variants_for(inst: dict) -> list[dict]:
    """Generate 8 variants for a known institution."""
    nm = inst["name"]
    city = inst.get("city")
    core = _core(nm, city)
    abbr = (
        nm.replace("College of Engineering", "Coll. of Engg.")
        .replace("Engineering College", "Engg. College")
        .replace("Institute", "Inst.")
        .replace("Technology", "Tech.")
    )
    rows = [
        ("exact", nm, city),
        ("abbr", abbr, city),
        ("upper", nm.upper(), city),
        ("typo", nm.replace("Technology", "Tecnology").replace("Engineering", "Enginering"), city),
        ("trailing", nm + " (AICTE approved)", city),
        ("drop_of", nm.replace(" of ", " "), city),
        ("no_city", core, None),
        ("no_city_given_city", core, city),
    ]
    return [{"kind": k, "name": n, "city": c, "truth_id": inst["id"]} for k, n, c in rows]


def negatives(insts: list[dict], seed: int = 11, per_kind: int = 40) -> list[dict]:
    """Generate negative controls with truth_id = None."""
    rng = random.Random(seed)
    existing = {
        (_core(i["name"], i.get("city")).lower(), (i.get("city") or "").lower())
        for i in insts
    }
    out = [
        {
            "kind": "unknown_name",
            "city": (c := rng.choice(ALL_CITIES)),
            "truth_id": None,
            "name": f"{rng.choice(NEG_PREFIXES)} {rng.choice(TYPE_WORDS)}, {c}",
        }
        for _ in range(per_kind)
    ]
    tries = 0
    while sum(o["kind"] == "other_city" for o in out) < per_kind and tries < 2000:
        tries += 1
        i = rng.choice(insts)
        c = rng.choice(ALL_CITIES)
        core = _core(i["name"], i.get("city"))
        city_i = (i.get("city") or "").lower()
        if (core.lower(), c.lower()) in existing or c.lower() == city_i:
            continue
        out.append({"kind": "other_city", "name": f"{core}, {c}", "city": c, "truth_id": None})
    return out
