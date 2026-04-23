# =============================================================
# Load dataset into Supabase
# =============================================================

import json
import os
from pathlib import Path
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(SCRIPT_DIR / ".env")

# ── Config ────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Keep non-API runtime settings in code.
INPUT_FILE = "step4_final_fix.json"
BATCH_SIZE = 100

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in scripts/.env or environment variables."
    )

# ── Connect ───────────────────────────────────────────────────
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Load dataset ──────────────────────────────────────────────
input_path = (SCRIPT_DIR / INPUT_FILE).resolve()

print(f"Loading {input_path.name}...")
with open(input_path, "r", encoding="utf-8") as f:
    words_data = json.load(f)
print(f"Loaded {len(words_data):,} words.\n")

# ── Build rows ────────────────────────────────────────────────
rows = []
for entry in words_data:
  rows.append({
      "id":        entry["id"],
      "english":   entry["english"].strip(),
      "bangla":    entry.get("bangla", []),
      "pos":       entry.get("pos", []),
      "root":      entry.get("root", "").strip(),
      "family_id": entry.get("family_id", "").strip(),
  })

# ── Insert in batches ─────────────────────────────────────────
total        = len(rows)
total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
inserted     = 0
failed       = 0

print(f"Inserting {total:,} rows in {total_batches} batches...\n")

for i in range(0, total, BATCH_SIZE):
    batch      = rows[i : i + BATCH_SIZE]
    batch_num  = i // BATCH_SIZE + 1

    print(f"  Batch {batch_num:>3}/{total_batches}  (rows {i+1}–{min(i+BATCH_SIZE, total):,})", end=" ... ", flush=True)

    try:
        supabase.table("words").insert(batch).execute()
        inserted += len(batch)
        print("✓")
    except Exception as e:
        failed += len(batch)
        print(f"✗  ERROR: {e}")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "=" * 50)
print("IMPORT COMPLETE")
print("=" * 50)
print(f"{'Total rows':<30} {total:>7,}")
print(f"{'Successfully inserted':<30} {inserted:>7,}")
print(f"{'Failed':<30} {failed:>7,}")

if failed == 0:
    print("\n✅ All words loaded into Supabase successfully.")
    print("You can now start building the Next.js app.")
else:
    print(f"\n⚠️  {failed} rows failed. Check the errors above.")