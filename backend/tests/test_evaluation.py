import json
from pathlib import Path
import uuid
import joblib
import numpy as np
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db import engine, SessionLocal
from ml import promote
from ml.train_overlap import held_out_split
from tests.conftest import login_token
from tests.test_coordination import isolated


@pytest.fixture(scope="module", autouse=True)
def schema():
    migration = Path(__file__).resolve().parents[2] / "db/migrations/050_shadow.sql"
    with engine.begin() as connection:
        connection.exec_driver_sql(migration.read_text())
        connection.exec_driver_sql(migration.read_text())


@pytest.fixture
def registered_models(tmp_path, monkeypatch):
    versions = ["test-evaluation-" + uuid.uuid4().hex for _ in range(2)]
    with SessionLocal() as db:
        original = db.execute(text("SELECT id FROM model_versions WHERE status='active'")).scalar_one()
        audit_start = db.execute(text("SELECT coalesce(max(id),0) FROM audit_log")).scalar()
        for version in versions:
            db.execute(text("INSERT INTO model_versions(id,kind,trained_on,metrics,status) VALUES(:v,'overlap','synthetic test','{}','shadow')"), {"v":version})
        db.commit()
    model = joblib.load(promote.ART / f"{original}.joblib")
    for version in [original,*versions]:
        joblib.dump({**model,"version":version},tmp_path / f"{version}.joblib")
    (tmp_path / "ACTIVE").write_text(original)
    monkeypatch.setattr(promote,"ART",tmp_path)
    try:
        yield original,versions,tmp_path
    finally:
        # Restore the original active DB model and remove only this fixture's IDs/audit records.
        # The real ACTIVE file was never changed; publication was redirected to tmp_path.
        with SessionLocal() as db:
            db.execute(text("UPDATE model_versions SET status='retired' WHERE status='active'"))
            db.execute(text("UPDATE model_versions SET status='active' WHERE id=:v"), {"v":original})
            for version in versions:
                db.execute(text("DELETE FROM audit_log WHERE id>:start AND entity='model' "
                                "AND (entity_id=:v OR detail->>'previous'=:v)"), {"start":audit_start,"v":version})
                db.execute(text("DELETE FROM model_versions WHERE id=:v"), {"v":version})
            db.commit()


def test_promote_rollback_and_pointer_after_commit(registered_models,monkeypatch):
    original,versions,directory = registered_models
    writer = promote.write_active_pointer
    observed = []
    def verify_commit(version):
        with SessionLocal() as db:
            assert db.execute(text("SELECT id FROM model_versions WHERE status='active'")).scalar_one() == version
        observed.append(version)
        writer(version)
    monkeypatch.setattr(promote,"write_active_pointer",verify_commit)
    assert promote.activate(versions[0])["version"] == versions[0]
    assert (directory / "ACTIVE").read_text() == versions[0]
    assert promote.activate(rollback=True)["version"] == original
    assert (directory / "ACTIVE").read_text() == original
    assert len(observed) == 2
    # An idempotent retry repairs a pointer if publication previously failed after commit.
    (directory / "ACTIVE").write_text("stale")
    assert promote.activate(original)["version"] == original
    assert (directory / "ACTIVE").read_text() == original


def test_unique_index_rejects_second_active(registered_models):
    _,versions,_ = registered_models
    with SessionLocal() as db:
        with pytest.raises(IntegrityError):
            with db.begin_nested():
                db.execute(text("UPDATE model_versions SET status='active' WHERE id=:v"), {"v":versions[0]})
        assert db.execute(text("SELECT count(*) FROM model_versions WHERE status='active'")).scalar() == 1


def test_model_card_and_admin_only_publication(client,token_rb1,registered_models):
    h = {"Authorization":f"Bearer {token_rb1}"}
    card = client.get("/api/model-card",headers=h)
    assert card.status_code == 200
    with SessionLocal() as db:
        assert {row['id'] for row in card.json()} == set(db.execute(text("SELECT id FROM parameter_registry")).scalars())
    assert client.post(f"/api/evaluation/promote/{registered_models[1][0]}",headers=h).status_code == 403
    admin = {"Authorization":f"Bearer {login_token(client,'admin')}"}
    assert client.get("/api/evaluation/models",headers=admin).status_code == 200
    assert client.get("/api/evaluation/shadow-disagreements",headers=admin).status_code == 200
    assert client.post(f"/api/evaluation/promote/{registered_models[1][0]}",headers=admin).status_code == 200
    assert client.post("/api/evaluation/rollback",headers=admin).status_code == 200


def test_shadow_writes_no_alerts_and_failure_does_not_break_creation(isolated,tmp_path,monkeypatch):
    client,db,headers,pair = isolated
    from app.services import shadow
    version = "test-shadow-" + uuid.uuid4().hex
    db.execute(text("INSERT INTO model_versions(id,kind,trained_on,metrics,status) VALUES(:v,'overlap','synthetic test','{}','shadow')"), {"v":version})
    active = (promote.ART / 'ACTIVE').read_text().strip()
    model = joblib.load(promote.ART / f"{active}.joblib")
    joblib.dump({**model,'version':version},tmp_path / f"{version}.joblib")
    monkeypatch.setattr(shadow,'ART',tmp_path)
    before = db.execute(text('SELECT count(*) FROM alerts')).scalar()
    shadow.shadow_score(db,pair.case_a,pair.case_b,[1,0.9,1,0,1,1])
    assert db.execute(text('SELECT count(*) FROM alerts')).scalar() == before
    assert db.execute(text('SELECT count(*) FROM shadow_scores WHERE model_version=:v'),{'v':version}).scalar() == 1
    (tmp_path / f"{version}.joblib").unlink()
    source = db.execute(text('SELECT c.*,i.name FROM cases c JOIN institutions i ON i.id=c.institution_id WHERE c.id=:i'),{'i':pair.case_a}).mappings().one()
    db.execute(text("INSERT INTO policy_settings(scope,value) VALUES('global','offline') ON CONFLICT(scope) DO UPDATE SET value='offline'"))
    response = client.post('/api/cases',headers=headers,json={'institution_name':source.name,'institution_id':source.institution_id,'category':source.category,'description':source.description,'bureau_code':'RB'})
    assert response.status_code == 201 and response.json()['overlap_scan_error'] is None
    assert response.json()['overlaps']
    assert db.execute(text('SELECT 1')).scalar() == 1


def test_canonical_split_has_no_institution_leakage():
    groups = np.repeat(np.arange(20),3)
    X = np.zeros((60,6))
    y = np.arange(60)%2
    train,test = held_out_split(X,y,groups)
    assert set(groups[train]).isdisjoint(set(groups[test]))
    assert set(train)|set(test) == set(range(60))
