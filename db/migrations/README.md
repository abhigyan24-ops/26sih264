# Migration ranges

Apply SQL files in numeric order to each lane database. Migrations must be idempotent.

- 001: shared wiring, if schema additions are needed (none required for T01).
- 010-029: Stage 6 overlap engine.
- 030-039: coordination.
- 040-049: alerts and SLA.
- 050-059: evaluation and shadow models.
- 060-069: privacy.

Do not edit previously applied migrations or schema.sql.
