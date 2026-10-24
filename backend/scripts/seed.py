"""
Synthetic seed data generator.

Run from backend/:
    python -m scripts.seed

Generates ~60 fictional institutions and ~350-450 complaint cases with:
- Realistic name variants for institution resolution testing
- Planted TRUE overlap pairs: same issue_key, different bureaus, different wording
- Hard-negative pairs: same institution, different category/issue (must NOT flag as high overlap)
- Hinglish text variants to test multilingual embedding

All data is labelled SYNTHETIC. The issue_key column is for evaluation only
and is never used as a model input during inference.

WARNING: This script TRUNCATEs cases, institutions, officers, actions, alerts,
overlap_links. It does NOT drop bureaus/categories/sla_rules which are
bootstrap data. Run only against dev/demo databases.
"""
import math
import random
import re
from datetime import date, timedelta

import bcrypt
from sqlalchemy import text

from app.db import engine
from app.services.embeddings import embed_many, vec_literal
from app.services.resolution import normalize
from app.config import settings

random.seed(42)

# ── Institution name components ───────────────────────────────────────────────
PREFIXES = [
    "Sri Venkateswara", "Dr. Ambedkar", "Maharana Pratap", "Netaji Subhas",
    "Rajiv Gandhi", "Sardar Patel", "Abdul Kalam", "Rabindranath Tagore",
    "Swami Vivekananda", "Chhatrapati Shivaji", "Jawaharlal Nehru",
    "Mahatma Gandhi", "Lal Bahadur Shastri", "Visvesvaraya", "Homi Bhabha",
    "Subramanya Bharati", "Aryabhatta", "Chanakya", "Bhagat Singh", "Guru Nanak",
]
TYPES = [
    "Institute of Technology", "College of Engineering", "Engineering College",
    "Institute of Management", "College of Pharmacy", "Institute of Science",
    "Polytechnic College",
]
# (city, state, region)
CITIES = [
    ("Pune", "Maharashtra", "West"), ("Nagpur", "Maharashtra", "West"),
    ("Bengaluru", "Karnataka", "South"), ("Mysuru", "Karnataka", "South"),
    ("Chennai", "Tamil Nadu", "South"), ("Coimbatore", "Tamil Nadu", "South"),
    ("Hyderabad", "Telangana", "South"), ("Jaipur", "Rajasthan", "North"),
    ("Lucknow", "Uttar Pradesh", "North"), ("Kanpur", "Uttar Pradesh", "North"),
    ("Bhopal", "Madhya Pradesh", "Central"), ("Indore", "Madhya Pradesh", "Central"),
    ("Kolkata", "West Bengal", "East"), ("Bhubaneswar", "Odisha", "East"),
    ("Patna", "Bihar", "East"), ("Ahmedabad", "Gujarat", "West"),
    ("Surat", "Gujarat", "West"), ("Chandigarh", "Chandigarh", "North"),
    ("Guwahati", "Assam", "East"), ("Dehradun", "Uttarakhand", "North"),
]

# ── Issue templates ───────────────────────────────────────────────────────────
# Structure: category → issue_suffix → [paraphrase templates]
# {inst} is substituted with either short name or full name
ISSUES: dict[str, dict[str, list[str]]] = {
    "FACULTY": {
        "fake_faculty": [
            "Faculty listed on the website at {inst} do not actually teach here, many appear to be fake names.",
            "Inspection indicates that teaching staff at {inst} are not as per AICTE norms and several are on paper only.",
            "{inst} shows faculty on its approval documents who have never taken a class. Please verify.",
            "{inst} ke kai faculty sirf kaagaz par hain, class mein koi padhane nahi aata.",
            "The teaching faculty shown in {inst}'s AICTE application are ghost employees.",
        ],
        "faculty_salary": [
            "Teachers at {inst} have not received salary for several months and some were forced to resign.",
            "Faculty members of {inst} complain of unpaid salaries and arbitrary termination.",
            "{inst} is not paying prescribed pay scales to its teaching staff.",
            "{inst} ke shikshak kaafi mahine se salary nahi pa rahe hain.",
        ],
        "faculty_shortage": [
            "{inst} is running courses with less than half the required faculty strength.",
            "Student to faculty ratio at {inst} far exceeds AICTE norms — many posts are vacant.",
        ],
    },
    "FEES": {
        "excess_fee": [
            "{inst} is charging fees far above the amount approved by the fee committee.",
            "Students report being forced to pay additional unapproved fees at {inst}.",
            "Fee demanded by {inst} exceeds the sanctioned structure and receipts are not provided.",
            "{inst} mein approved fees se bahut zyada paisa maanga ja raha hai.",
            "Capitation charges are being collected at {inst} under various false pretexts.",
        ],
        "refund_denied": [
            "{inst} refuses to refund fees even after the student withdrew before the deadline.",
            "I withdrew my admission from {inst} within the allowed period but the refund is being denied.",
            "{inst} ne refund nahi diya jab maine admission cancel karaya.",
        ],
    },
    "APPROVAL": {
        "extra_intake": [
            "{inst} has admitted more students than the sanctioned intake for the current year.",
            "Intake at {inst} is beyond the approved seats, which risks the validity of degrees.",
            "{inst} is running a new course without AICTE approval and admitting students into it.",
        ],
        "closed_course": [
            "{inst} continues to admit students to a programme whose approval was withdrawn.",
            "A course closed by AICTE is still being advertised and run by {inst}.",
        ],
    },
    "CERTIFICATE": {
        "orig_docs": [
            "{inst} is holding my original certificates and refusing to return them after I left.",
            "My original documents are being retained by {inst} until I pay unrelated dues.",
            "{inst} ne mere original certificate rok rakhe hain aur wapas nahi de rahe.",
            "Original academic documents have been withheld by {inst} as a coercive measure.",
        ],
    },
    "INFRA": {
        "labs_missing": [
            "{inst} does not have the laboratories and equipment promised at the time of admission.",
            "The labs at {inst} are non-functional and the library is practically empty.",
            "Infrastructure at {inst} is far below AICTE norms: no working labs, inadequate classrooms.",
            "{inst} mein labs band hain aur library bilkul khaali hai.",
        ],
    },
    "MISREP": {
        "false_claim": [
            "{inst} advertises AICTE approval and accreditation that it does not actually hold.",
            "Brochures of {inst} falsely claim approval status and placement records.",
            "{inst} misleads applicants about its affiliation and AICTE approval.",
            "{inst} jhoothe daave karta hai ki usse AICTE ki manzuuri hai.",
        ],
    },
}


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def main() -> None:
    with engine.begin() as c:
        # Truncate mutable tables only (not bureaus/categories/sla_rules)
        c.execute(text(
            "TRUNCATE alerts, overlap_links, documents, actions, cases, "
            "institution_aliases, institutions, officers RESTART IDENTITY CASCADE"
        ))

        bureaus = {r.code: r.id for r in c.execute(text("SELECT id, code FROM bureaus"))}
        slas = {
            r.category: r.deadline_days
            for r in c.execute(text("SELECT category, deadline_days FROM sla_rules"))
        }

        # ── Officers ──────────────────────────────────────────────────────────
        pw = hash_pw("demo123")
        users = [
            ("rb1",    "Asha Verma (RB)",           "officer",    "RB",    None),
            ("rb2",    "Ravi Iyer (RB)",             "officer",    "RB",    None),
            ("pgrc1",  "Meera Nair (PGRC)",           "officer",    "PGRC",  None),
            ("pgrc2",  "Sanjay Gupta (PGRC)",         "officer",    "PGRC",  None),
            ("south1", "Kiran Rao (Regional South)",  "regional",   "ROC-S", "South"),
            ("north1", "Priya Singh (Regional North)", "regional",  "ROC-N", "North"),
            ("mgmt1",  "Dr. R. Sharma (Management)",  "management", None,    None),
            ("admin",  "System Admin",                "admin",      None,    None),
        ]
        for u, n, r, b, reg in users:
            c.execute(
                text(
                    "INSERT INTO officers (username,full_name,password_hash,role,bureau_id,region) "
                    "VALUES (:u,:n,:p,:r,:b,:reg)"
                ),
                {"u": u, "n": n, "p": pw, "r": r,
                 "b": bureaus.get(b) if b else None, "reg": reg},
            )

        officer_by_bureau: dict[int, list[int]] = {}
        for row in c.execute(text("SELECT id, bureau_id FROM officers WHERE bureau_id IS NOT NULL")):
            officer_by_bureau.setdefault(row.bureau_id, []).append(row.id)

        # ── Institutions (60 unique) ───────────────────────────────────────────
        insts: list[dict] = []
        used: set[str] = set()
        while len(insts) < 60:
            prefix = random.choice(PREFIXES)
            itype = random.choice(TYPES)
            city, state, region = random.choice(CITIES)
            name = f"{prefix} {itype}, {city}"
            if name in used:
                continue
            used.add(name)
            aid = "1-" + "".join(random.choice("0123456789") for _ in range(8))
            iid = c.execute(
                text(
                    "INSERT INTO institutions "
                    "(aicte_permanent_id,name,normalized_name,address,city,state,region,inst_type) "
                    "VALUES (:a,:n,:nn,:ad,:ci,:st,:re,:ty) RETURNING id"
                ),
                {
                    "a": aid, "n": name, "nn": normalize(name),
                    "ad": f"{city}, {state}", "ci": city,
                    "st": state, "re": region, "ty": itype,
                },
            ).scalar()
            insts.append({"id": iid, "name": name, "short": f"{prefix} {itype}", "region": region})

        # ── Cases ─────────────────────────────────────────────────────────────
        # Each row: (inst_dict, bureau_code, category, issue_key, status, received, closed, text)
        rows: list[tuple] = []
        today = date.today()
        cats = list(ISSUES.keys())

        def add_case(inst: dict, bureau: str, cat: str, issue: str, active: bool) -> None:
            received = today - timedelta(days=random.randint(3, 100 if active else 400))
            if active:
                status = random.choice([
                    "registered", "assigned", "under_process",
                    "under_process", "escalated", "action_taken",
                ])
                closed = None
            else:
                status = "disposed"
                dur = max(3, int(random.lognormvariate(math.log(slas[cat] * 0.8), 0.45)))
                closed = received + timedelta(days=dur)
                if closed > today:
                    closed = today

            inst_label = inst["short"] if random.random() < 0.7 else inst["name"]
            text_ = random.choice(ISSUES[cat][issue]).format(inst=inst_label)
            issue_key = f"{inst['id']}:{issue}"
            rows.append((inst, bureau, cat, issue_key, status, received, closed, text_))

        for inst in insts:
            # Historical closed cases (2-6 per institution)
            for _ in range(random.randint(2, 6)):
                cat = random.choice(cats)
                issue = random.choice(list(ISSUES[cat]))
                bureau = random.choice(["RB", "PGRC", "ROC-N", "ROC-S", "ROC-E", "ROC-W"])
                add_case(inst, bureau, cat, issue, active=False)

            # Active case pattern:
            r = random.random()
            if r < 0.40:
                # TRUE overlap: same issue, RB + PGRC, differently worded
                cat = random.choice(cats)
                issue = random.choice(list(ISSUES[cat]))
                add_case(inst, "PGRC", cat, issue, active=True)
                add_case(inst, "RB", cat, issue, active=True)
            elif r < 0.65:
                # HARD NEGATIVE: same institution, different categories
                c1, c2 = random.sample(cats, 2)
                add_case(inst, "PGRC", c1, random.choice(list(ISSUES[c1])), active=True)
                add_case(inst, "RB",   c2, random.choice(list(ISSUES[c2])), active=True)
            elif r < 0.85:
                # Single active case
                cat = random.choice(cats)
                add_case(
                    inst,
                    random.choice(["RB", "PGRC"]),
                    cat,
                    random.choice(list(ISSUES[cat])),
                    active=True,
                )
            # else: institution has only historical cases (no active)

        # ── Compute embeddings for all case texts ─────────────────────────────
        print(f"Computing embeddings for {len(rows)} cases...")
        texts = [r[7] for r in rows]
        vecs = embed_many(texts)
        print("Embeddings done. Inserting cases...")

        for (inst, bureau, cat, issue_key, status, received, closed, desc), vec in zip(rows, vecs):
            bid = bureaus[bureau]
            officer = random.choice(officer_by_bureau.get(bid, [None]))
            due = received + timedelta(days=slas[cat])
            priority = random.choices(["low", "normal", "high"], weights=[15, 60, 25])[0]

            cid = c.execute(
                text(
                    """
                    INSERT INTO cases
                      (institution_id,inst_match_conf,category,description,
                       received_date,status,bureau_id,officer_id,
                       sla_due_date,closed_date,priority,
                       embedding,embedding_model,issue_key,next_action)
                    VALUES
                      (:i,:conf,:cat,:d,:rd,:st,:b,:o,:due,:cd,:pri,
                       CAST(:v AS vector),:m,:ik,:na)
                    RETURNING id
                    """
                ),
                {
                    "i": inst["id"],
                    "conf": round(random.uniform(0.90, 1.0), 3),
                    "cat": cat,
                    "d": desc,
                    "rd": received,
                    "st": status,
                    "b": bid,
                    "o": officer,
                    "due": due,
                    "cd": closed,
                    "pri": priority,
                    "v": vec_literal(vec),
                    "m": settings.embed_model,
                    "ik": issue_key,
                    "na": None if closed else "Review reply and decide next step",
                },
            ).scalar()

            c.execute(
                text("UPDATE cases SET case_ref='CASE-'||lpad(id::text,6,'0') WHERE id=:i"),
                {"i": cid},
            )
            c.execute(
                text(
                    "INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,created_at) "
                    "VALUES (:c,:b,:o,'registered','Case registered',:t)"
                ),
                {"c": cid, "b": bid, "o": officer, "t": received},
            )
            if closed:
                c.execute(
                    text(
                        "INSERT INTO actions (case_id,bureau_id,officer_id,action_type,remarks,created_at) "
                        "VALUES (:c,:b,:o,'closed','Case disposed',:t)"
                    ),
                    {"c": cid, "b": bid, "o": officer, "t": closed},
                )

    print(f"[OK] Seeded {len(insts)} institutions and {len(rows)} cases.")
    print("  Run: python -m ml.train_overlap")


if __name__ == "__main__":
    main()
