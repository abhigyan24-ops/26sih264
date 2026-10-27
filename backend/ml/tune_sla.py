"""Time-aware replay of synthetic closed cases to tune an SLA warning threshold."""
from collections import defaultdict
from datetime import timedelta
import json
import logging
from sqlalchemy import text
from app.db import SessionLocal
from app.services.params import get_param, invalidate_cache

log = logging.getLogger(__name__)
FALSE_WARNING_TARGET = 0.10


def tune():
    with SessionLocal() as db:
        minimum = int(get_param(db,"sla_min_history",15))
        cases = [dict(row) for row in db.execute(text("SELECT c.id,c.category,c.received_date,c.closed_date,s.deadline_days "
                    "FROM cases c JOIN sla_rules s ON s.category=c.category WHERE c.closed_date IS NOT NULL "
                    "AND c.closed_date>=c.received_date")).mappings()]
        by_category = defaultdict(list)
        for case in cases:
            case["duration"] = (case["closed_date"]-case["received_date"]).days
            by_category[case["category"]].append(case)
        histories = []
        for case in cases:
            samples = []
            for age in range(min(case["duration"],case["deadline_days"])):
                day = case["received_date"] + timedelta(days=age)
                past = [other["duration"] for other in by_category[case["category"]] if other["id"] != case["id"] and other["closed_date"] <= day]
                still_open = sum(duration>age for duration in past)
                if len(past)>=minimum and still_open:
                    risk = sum(duration>case["deadline_days"] for duration in past)/still_open
                    samples.append((age,risk))
            histories.append((case,samples))
        breaches = sum(case["duration"]>case["deadline_days"] for case in cases)
        def metrics(threshold):
            false = hits = 0
            leads = []
            for case,samples in histories:
                age = next((age for age,risk in samples if risk>=threshold),None)
                breached = case["duration"]>case["deadline_days"]
                if age is not None:
                    if breached:
                        hits += 1
                        leads.append(case["deadline_days"]-age)
                    else:
                        false += 1
            return {"false_warning_rate":false/max(1,len(cases)-breaches), "breach_recall":hits/max(1,breaches),
                    "mean_lead_days_per_breach":sum(leads)/max(1,breaches), "warned_breaches":hits}
        candidates = sorted({round(risk,6) for _,samples in histories for _,risk in samples} | {0.6})
        acceptable = [(threshold,metrics(threshold)) for threshold in candidates] if len(cases)>=30 and breaches>=5 else []
        acceptable = [(t,m) for t,m in acceptable if m["false_warning_rate"]<=FALSE_WARNING_TARGET and m["warned_breaches"]>0]
        if acceptable:
            threshold, measured = max(acceptable,key=lambda item:(item[1]["mean_lead_days_per_breach"],item[1]["breach_recall"],item[0]))
            origin,reason = "learned_synthetic","earliest warning subject to 10% false-warning policy"
        else:
            threshold, measured = 0.6,metrics(0.6)
            origin,reason = "default_pending_data","insufficient replay history or no threshold meets false-warning policy; default retained"
        result = {"threshold":threshold,"origin":origin,"reason":reason,"closed_cases":len(cases),"breaches":breaches,
                  "minimum_history":minimum,"false_warning_target":FALSE_WARNING_TARGET,**measured,
                  "baseline":metrics(0.6),"warning":"synthetic replay; not real-world performance"}
        result["lead_time_gained_days"] = measured["mean_lead_days_per_breach"]-result["baseline"]["mean_lead_days_per_breach"]
        db.execute(text("INSERT INTO parameter_registry(parameter,value,origin,derived_from,metrics) "
                        "VALUES('sla_risk_threshold',:v,:o,:d,CAST(:m AS jsonb))"),
                   {"v":str(threshold),"o":origin,"d":reason,"m":json.dumps(result)})
        db.execute(text("INSERT INTO parameter_registry(parameter,value,origin,derived_from) "
                        "SELECT 'sla_min_history','15','default_pending_data','minimum history policy' "
                        "WHERE NOT EXISTS(SELECT 1 FROM parameter_registry WHERE parameter='sla_min_history')"))
        db.commit()
        invalidate_cache()
        return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,format="%(message)s")
    log.info(json.dumps(tune(),indent=2))
