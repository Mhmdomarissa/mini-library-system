#!/bin/bash
# ============================================================
# Fine Calculation Test Suite — mini-library-system Phase 3
#
# Tests covered (11 cases):
#   F01 — 201  Borrow book A (on-time scenario)
#   F02 — 200  Immediately return book A → fine=0, daysOverdue=0
#   F03 — 200  History shows fine=0 on returned record
#   F04 — 201  Borrow book B (overdue scenario)
#   F05 — DB   Back-date dueDate 2 days via mongosh
#   F06 — 200  Return book B → fine=2, daysOverdue=2
#   F07 — 200  History shows daysOverdue=2, fine=2 on returned record
#   F08 — 201  Borrow book C (still active overdue scenario)
#   F09 — DB   Back-date dueDate 3 days via mongosh
#   F10 — 200  History ?status=borrowed shows daysOverdue=3, fine=3
#   F11 — 200  Admin list ?overdue=true shows fine>0
#
# Prerequisites:
#   • Backend running on http://localhost:4000
#   • MongoDB running (replica set rs0)
#   • admin@test.com + member@test.com already exist in Firebase
# ============================================================

BASE="http://localhost:4000"
FIREBASE_KEY="AIzaSyDW130QixpuTTITDq2yX9qdvjvMLHv3jXs"
PASS=0
FAIL=0
TS=$(date +%s)

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────
sign_in() {
  curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])"
}

# run_test <label> <expected_code> <method> <url> <body|--> <token>
run_test() {
  local LABEL=$1
  local EXPECTED=$2
  local METHOD=$3
  local URL=$4
  local BODY=$5
  local USE_TOK=${6:-ADMIN}

  case "$USE_TOK" in
    ADMIN)  TOK="$ADMIN_TOKEN" ;;
    MEMBER) TOK="$MEMBER_TOKEN" ;;
    none)   TOK="" ;;
  esac

  if [ "$BODY" != "--" ]; then
    RESP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOK" \
      -d "$BODY")
  else
    if [ -n "$TOK" ]; then
      RESP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Authorization: Bearer $TOK")
    else
      RESP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL")
    fi
  fi

  BODY_OUT=$(python3 -m json.tool /tmp/fine_resp.json 2>/dev/null || cat /tmp/fine_resp.json)

  if [ "$RESP" = "$EXPECTED" ]; then
    echo -e "${GREEN}✅  [$RESP] $LABEL${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌  [$RESP] $LABEL  (expected $EXPECTED)${RESET}"
    FAIL=$((FAIL + 1))
  fi
  echo "$BODY_OUT"
  echo "---"
}

# check_fine_field <label> <json_path_expr> <expected_value>
#   json_path_expr: a Python expression applied to the parsed response dict
check_field() {
  local LABEL="$1"
  local EXPR="$2"
  local EXPECTED="$3"
  local ACTUAL
  ACTUAL=$(python3 -c "
import json, sys
d = json.load(open('/tmp/fine_resp.json'))
try:
    val = $EXPR
    print(val)
except Exception as e:
    print('ERROR: ' + str(e))
" 2>/dev/null)

  if [ "$ACTUAL" = "$EXPECTED" ]; then
    echo -e "${GREEN}    ✅  $LABEL = $ACTUAL (expected $EXPECTED)${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}    ❌  $LABEL = $ACTUAL (expected $EXPECTED)${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

# check_field_gt <label> <expr> <threshold>  — asserts value > threshold
check_field_gt() {
  local LABEL="$1"
  local EXPR="$2"
  local THRESHOLD="$3"
  local ACTUAL
  ACTUAL=$(python3 -c "
import json, sys
d = json.load(open('/tmp/fine_resp.json'))
try:
    val = $EXPR
    print(val)
except Exception as e:
    print('ERROR: ' + str(e))
" 2>/dev/null)

  # Compare numerically
  if python3 -c "import sys; sys.exit(0 if float('$ACTUAL') > float('$THRESHOLD') else 1)" 2>/dev/null; then
    echo -e "${GREEN}    ✅  $LABEL = $ACTUAL > $THRESHOLD${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}    ❌  $LABEL = $ACTUAL, expected > $THRESHOLD${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

# ── Auth ──────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}🔐 Acquiring tokens...${RESET}"
ADMIN_TOKEN=$(sign_in "admin@test.com" "Test1234!")
MEMBER_TOKEN=$(sign_in "member@test.com" "Test1234!")
echo "✅  Admin token  (${#ADMIN_TOKEN} chars)"
echo "✅  Member token (${#MEMBER_TOKEN} chars)"

# ── Ensure admin role ─────────────────────────────────────────
mongosh mini-library --quiet --eval \
  'db.users.updateOne({ email: "admin@test.com" }, { $set: { role: "admin" } })' 2>/dev/null

# ── Seed books ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}📚 Seeding test books...${RESET}"

create_book() {
  local SUFFIX="$1"
  curl -s --max-time 15 -X POST "$BASE/api/books" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"title\":\"Fine Test Book $SUFFIX\",\"author\":\"Fine Author\",\"isbn\":\"FT-$TS-$SUFFIX\",\"genre\":\"Technology\",\"publishedYear\":2024,\"totalCopies\":5,\"description\":\"Created by fine test script\"}" \
    -o /tmp/fine_resp.json
  python3 -c "import json; print(json.load(open('/tmp/fine_resp.json'))['data']['book']['_id'])"
}

BOOK_A=$(create_book "A")
BOOK_B=$(create_book "B")
BOOK_C=$(create_book "C")
echo "✅  Book A (on-time scenario):         $BOOK_A"
echo "✅  Book B (overdue return scenario):  $BOOK_B"
echo "✅  Book C (still-borrowed overdue):   $BOOK_C"

# ─────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  FINE CALCULATION TEST SUITE"
echo "════════════════════════════════════════════════════════"

# ── F01 — 201 Borrow Book A ───────────────────────────────────
echo ""
echo -e "${CYAN}════ F01 — 201 Borrow Book A (on-time scenario) ════${RESET}"
BORROW_A_HTTP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" \
  -X POST "$BASE/api/borrow/$BOOK_A" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
BORROW_A_ID=$(python3 -c "import json; print(json.load(open('/tmp/fine_resp.json'))['data']['borrowId'])" 2>/dev/null)
python3 -m json.tool /tmp/fine_resp.json 2>/dev/null
if [ "$BORROW_A_HTTP" = "201" ]; then
  echo -e "${GREEN}✅  [201] Borrow A created  ID=$BORROW_A_ID${RESET}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌  [$BORROW_A_HTTP] Borrow A failed${RESET}"; FAIL=$((FAIL + 1))
fi
echo "---"

# ── F02 — 200 Return Book A immediately → fine=0 ─────────────
echo ""
echo -e "${CYAN}════ F02 — 200 Return Book A immediately (fine=0) ════${RESET}"
run_test "POST /api/borrow/return/$BORROW_A_ID — on-time → fine=0" "200" \
  "POST" "/api/borrow/return/$BORROW_A_ID" "--" "MEMBER"
echo -e "${YELLOW}  Checking fine fields in return response...${RESET}"
check_field    "daysOverdue" "d['data']['borrowRecord']['daysOverdue']" "0"
check_field    "fine"        "d['data']['borrowRecord']['fine']"        "0"

# ── F03 — 200 History shows fine=0 on returned record ─────────
echo ""
echo -e "${CYAN}════ F03 — 200 History shows fine=0 for on-time return ════${RESET}"
run_test "GET /api/borrow/history?status=returned — member → 200" "200" \
  "GET" "/api/borrow/history?status=returned" "--" "MEMBER"
echo -e "${YELLOW}  Checking fine fields on first history item...${RESET}"
check_field "borrows[0].daysOverdue" "d['data']['borrows'][0]['daysOverdue']" "0"
check_field "borrows[0].fine"        "d['data']['borrows'][0]['fine']"        "0"

# ── F04 — 201 Borrow Book B ───────────────────────────────────
echo ""
echo -e "${CYAN}════ F04 — 201 Borrow Book B (overdue return scenario) ════${RESET}"
BORROW_B_HTTP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" \
  -X POST "$BASE/api/borrow/$BOOK_B" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
BORROW_B_ID=$(python3 -c "import json; print(json.load(open('/tmp/fine_resp.json'))['data']['borrowId'])" 2>/dev/null)
python3 -m json.tool /tmp/fine_resp.json 2>/dev/null
if [ "$BORROW_B_HTTP" = "201" ]; then
  echo -e "${GREEN}✅  [201] Borrow B created  ID=$BORROW_B_ID${RESET}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌  [$BORROW_B_HTTP] Borrow B failed${RESET}"; FAIL=$((FAIL + 1))
fi
echo "---"

# ── F05 — DB: Back-date dueDate 2 days ───────────────────────
echo ""
echo -e "${CYAN}════ F05 — DB: Back-date dueDate by 2 days ════${RESET}"
BACKDATE_2_DAYS_AGO=$(python3 -c "
from datetime import datetime, timedelta, timezone
dt = datetime.now(timezone.utc) - timedelta(hours=47)
print(dt.strftime('%Y-%m-%dT%H:%M:%S.000+00:00'))
")
mongosh mini-library --quiet --eval "
db.borrowrecords.updateOne(
  { _id: ObjectId('$BORROW_B_ID') },
  { \$set: { dueDate: new Date('$BACKDATE_2_DAYS_AGO') } }
)
" 2>/dev/null
echo -e "${GREEN}✅  dueDate back-dated to $BACKDATE_2_DAYS_AGO (2 days ago)${RESET}"
echo "---"

# ── F06 — 200 Return Book B → fine=2, daysOverdue=2 ──────────
echo ""
echo -e "${CYAN}════ F06 — 200 Return Book B overdue → daysOverdue=2, fine=2 ════${RESET}"
run_test "POST /api/borrow/return/$BORROW_B_ID — 2 days overdue → 200" "200" \
  "POST" "/api/borrow/return/$BORROW_B_ID" "--" "MEMBER"
echo -e "${YELLOW}  Checking fine fields in return response...${RESET}"
check_field    "daysOverdue" "d['data']['borrowRecord']['daysOverdue']" "2"
check_field    "fine"        "d['data']['borrowRecord']['fine']"        "2"

# ── F07 — 200 History shows daysOverdue + fine on returned overdue record ──
echo ""
echo -e "${CYAN}════ F07 — 200 History shows daysOverdue=2, fine=2 on returned record ════${RESET}"
run_test "GET /api/borrow/history?status=returned — check fine in history" "200" \
  "GET" "/api/borrow/history?status=returned" "--" "MEMBER"
echo -e "${YELLOW}  Finding Book B borrow in history and checking fine fields...${RESET}"
python3 << PYCHECK
import json, sys

with open('/tmp/fine_resp.json') as f:
    d = json.load(f)

borrows = d.get('data', {}).get('borrows', [])
target_borrow_id = '$BORROW_B_ID'

record = next((b for b in borrows if b.get('_id') == target_borrow_id), None)
if record is None:
    print(f"\033[31m    ❌  Could not find Borrow B ({target_borrow_id}) in history\033[0m")
    sys.exit(1)

days = record.get('daysOverdue', 'MISSING')
fine = record.get('fine', 'MISSING')

ok_days = str(days) == '2'
ok_fine = str(fine) == '2'

prefix_days = "\033[32m    ✅" if ok_days else "\033[31m    ❌"
prefix_fine = "\033[32m    ✅" if ok_fine else "\033[31m    ❌"
print(f"{prefix_days}  history daysOverdue = {days} (expected 2)\033[0m")
print(f"{prefix_fine}  history fine        = {fine} (expected 2)\033[0m")

sys.exit(0 if ok_days and ok_fine else 1)
PYCHECK
PY_EXIT=$?
if [ $PY_EXIT -eq 0 ]; then
  PASS=$((PASS + 2))
else
  FAIL=$((FAIL + 2))
fi
echo "---"

# ── F08 — 201 Borrow Book C ───────────────────────────────────
echo ""
echo -e "${CYAN}════ F08 — 201 Borrow Book C (still-borrowed overdue) ════${RESET}"
BORROW_C_HTTP=$(curl -s -o /tmp/fine_resp.json -w "%{http_code}" \
  -X POST "$BASE/api/borrow/$BOOK_C" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
BORROW_C_ID=$(python3 -c "import json; print(json.load(open('/tmp/fine_resp.json'))['data']['borrowId'])" 2>/dev/null)
python3 -m json.tool /tmp/fine_resp.json 2>/dev/null
if [ "$BORROW_C_HTTP" = "201" ]; then
  echo -e "${GREEN}✅  [201] Borrow C created  ID=$BORROW_C_ID${RESET}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌  [$BORROW_C_HTTP] Borrow C failed${RESET}"; FAIL=$((FAIL + 1))
fi
echo "---"

# ── F09 — DB: Back-date dueDate 3 days ───────────────────────
echo ""
echo -e "${CYAN}════ F09 — DB: Back-date Borrow C dueDate by 3 days ════${RESET}"
BACKDATE_3_DAYS_AGO=$(python3 -c "
from datetime import datetime, timedelta, timezone
dt = datetime.now(timezone.utc) - timedelta(hours=71)
print(dt.strftime('%Y-%m-%dT%H:%M:%S.000+00:00'))
")
mongosh mini-library --quiet --eval "
db.borrowrecords.updateOne(
  { _id: ObjectId('$BORROW_C_ID') },
  { \$set: { dueDate: new Date('$BACKDATE_3_DAYS_AGO') } }
)
" 2>/dev/null
echo -e "${GREEN}✅  dueDate back-dated to $BACKDATE_3_DAYS_AGO (3 days ago)${RESET}"
echo "---"

# ── F10 — 200 History ?status=borrowed shows daysOverdue=3, fine=3 ────────
echo ""
echo -e "${CYAN}════ F10 — 200 Active borrow history shows daysOverdue=3, fine=3 ════${RESET}"
run_test "GET /api/borrow/history?status=borrowed — check overdue fine" "200" \
  "GET" "/api/borrow/history?status=borrowed" "--" "MEMBER"
echo -e "${YELLOW}  Finding Book C borrow in active history and checking fine fields...${RESET}"
python3 << PYCHECK
import json, sys

with open('/tmp/fine_resp.json') as f:
    d = json.load(f)

borrows = d.get('data', {}).get('borrows', [])
target_borrow_id = '$BORROW_C_ID'

record = next((b for b in borrows if b.get('_id') == target_borrow_id), None)
if record is None:
    print(f"\033[31m    ❌  Could not find Borrow C ({target_borrow_id}) in active borrows\033[0m")
    sys.exit(1)

days = record.get('daysOverdue', 'MISSING')
fine = record.get('fine', 'MISSING')

ok_days = str(days) == '3'
ok_fine = str(fine) == '3'

prefix_days = "\033[32m    ✅" if ok_days else "\033[31m    ❌"
prefix_fine = "\033[32m    ✅" if ok_fine else "\033[31m    ❌"
print(f"{prefix_days}  active daysOverdue = {days} (expected 3)\033[0m")
print(f"{prefix_fine}  active fine        = {fine} (expected 3)\033[0m")

sys.exit(0 if ok_days and ok_fine else 1)
PYCHECK
PY_EXIT=$?
if [ $PY_EXIT -eq 0 ]; then
  PASS=$((PASS + 2))
else
  FAIL=$((FAIL + 2))
fi
echo "---"

# ── F11 — 200 Admin ?overdue=true shows fine>0 ───────────────
echo ""
echo -e "${CYAN}════ F11 — 200 Admin overdue list shows fine > 0 ════${RESET}"
run_test "GET /api/admin/borrow?overdue=true — admin → 200" "200" \
  "GET" "/api/admin/borrow?overdue=true" "--" "ADMIN"
echo -e "${YELLOW}  Checking that at least one borrow has fine > 0...${RESET}"
python3 << PYCHECK
import json, sys

with open('/tmp/fine_resp.json') as f:
    d = json.load(f)

borrows = d.get('data', {}).get('borrows', [])
overdue_with_fine = [b for b in borrows if (b.get('fine') or 0) > 0]

if overdue_with_fine:
    example = overdue_with_fine[0]
    print(f"\033[32m    ✅  Found {len(overdue_with_fine)} overdue borrow(s) with fine > 0\033[0m")
    print(f"        Example: daysOverdue={example.get('daysOverdue')}, fine={example.get('fine')}\033[0m")
    sys.exit(0)
else:
    print(f"\033[31m    ❌  No borrows with fine > 0 found in admin overdue list\033[0m")
    sys.exit(1)
PYCHECK
PY_EXIT=$?
if [ $PY_EXIT -eq 0 ]; then
  PASS=$((PASS + 1))
else
  FAIL=$((FAIL + 1))
fi
echo "---"

# ── Cleanup ───────────────────────────────────────────────────
echo ""
echo -e "${CYAN}🧹 Cleaning up...${RESET}"

# Return Book C (still active)
if [ -n "$BORROW_C_ID" ]; then
  curl -s -X POST "$BASE/api/borrow/return/$BORROW_C_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" > /dev/null
  echo "✅  Returned Book C borrow ($BORROW_C_ID)"
fi

# Delete seeded books
for BID in "$BOOK_A" "$BOOK_B" "$BOOK_C"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/books/$BID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "✅  Deleted book $BID ($STATUS)"
done

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  ✅  ALL $TOTAL TESTS PASSED${RESET}"
else
  echo -e "${RED}  ❌  $FAIL/$TOTAL TESTS FAILED${RESET}"
fi
echo "════════════════════════════════════════════════════════"
echo ""

exit $FAIL
