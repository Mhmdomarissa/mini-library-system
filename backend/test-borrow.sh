#!/bin/bash
# ============================================================
# Borrow / Return API test suite — mini-library-system
#
# Tests covered (15 cases):
#   B01 — 401  No token
#   B02 — 403  Admin tries to borrow (wrong role)
#   B03 — 404  Non-existent book
#   B04 — 400  Archived book
#   B05 — 201  Successful borrow
#   B06 — 200  Member history — 1 active borrow
#   B07 — 409  Duplicate active borrow (same book, same user)
#   B08 — 200  Return book
#   B09 — 400  Return already-returned book
#   B10 — 200  History filtered by status=returned
#   B11 — 201  Member borrows last 1-copy book (→ becomes out_of_stock)
#   B12 — 400  Different user tries to borrow the out_of_stock book
#   B13 — 403  Member token on admin route
#   B14 — 200  Admin lists all borrows
#   B15 — 200  Admin filters by status=returned
#   B16 — 200  Admin filters by overdue=true
#
# Prerequisites:
#   • Backend running on http://localhost:4000
#   • MongoDB running (replica set rs0)
#   • admin@test.com + member@test.com already exist in Firebase
# ============================================================
# Run with default bash settings (no set -e) so failed curl responses

BASE="http://localhost:4000"
FIREBASE_KEY="AIzaSyDW130QixpuTTITDq2yX9qdvjvMLHv3jXs"
PASS=0
FAIL=0
# Timestamp suffix ensures unique ISBNs on every run (script is safely re-runnable)
TS=$(date +%s)

# ── Colour codes ─────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────
sign_in() {
  curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])"
}

sign_up() {
  curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" > /dev/null 2>&1 || true
}

# run_test <label> <expected_code> <method> <url> <body|--> <token|none|MEMBER|MEMBER2>
run_test() {
  local LABEL=$1
  local EXPECTED=$2
  local METHOD=$3
  local URL=$4
  local BODY=$5
  local USE_TOK=${6:-ADMIN}

  case "$USE_TOK" in
    ADMIN)   TOK="$ADMIN_TOKEN" ;;
    MEMBER)  TOK="$MEMBER_TOKEN" ;;
    MEMBER2) TOK="$MEMBER2_TOKEN" ;;
    none)    TOK="" ;;
  esac

  if [ "$BODY" != "--" ]; then
    if [ -n "$TOK" ]; then
      RESP=$(curl -s -o /tmp/borrow_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOK" \
        -d "$BODY")
    else
      RESP=$(curl -s -o /tmp/borrow_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Content-Type: application/json" \
        -d "$BODY")
    fi
  else
    if [ -n "$TOK" ]; then
      RESP=$(curl -s -o /tmp/borrow_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Authorization: Bearer $TOK")
    else
      RESP=$(curl -s -o /tmp/borrow_resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL")
    fi
  fi

  BODY_OUT=$(python3 -m json.tool /tmp/borrow_resp.json 2>/dev/null || cat /tmp/borrow_resp.json)

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

# ── Step 1 — Auth setup ───────────────────────────────────────
echo ""
echo -e "${CYAN}🔐 Acquiring tokens...${RESET}"
ADMIN_TOKEN=$(sign_in "admin@test.com" "Test1234!")
MEMBER_TOKEN=$(sign_in "member@test.com" "Test1234!")
sign_up "member2@test.com" "Test1234!"
MEMBER2_TOKEN=$(sign_in "member2@test.com" "Test1234!")
echo "✅  Admin token  (${#ADMIN_TOKEN} chars)"
echo "✅  Member token (${#MEMBER_TOKEN} chars)"
echo "✅  Member2 token (${#MEMBER2_TOKEN} chars)"

# ── Step 2 — Ensure admin role ────────────────────────────────
echo ""
echo -e "${CYAN}👑 Ensuring admin role...${RESET}"
mongosh mini-library --quiet --eval \
  'db.users.updateOne({ email: "admin@test.com" }, { $set: { role: "admin" } })' 2>/dev/null
echo "✅  admin@test.com → role:admin"

# ── Step 3 — Seed test books ──────────────────────────────────
echo ""
echo -e "${CYAN}📚 Creating test books...${RESET}"

# Regular 5-copy book for borrow/return/duplicate tests
BOOK_RESP=$(curl -s -X POST "$BASE/api/books" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"title\":\"Borrow Test Book\",\"author\":\"Test Author\",\"isbn\":\"BT-$TS\",\"genre\":\"Technology\",\"publishedYear\":2023,\"totalCopies\":5,\"description\":\"Created by borrow test script\"}")
BOOK_ID=$(echo "$BOOK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['book']['_id'])" 2>/dev/null)
if [ -z "$BOOK_ID" ]; then echo "ERROR: could not parse BOOK_ID from: $BOOK_RESP"; exit 1; fi
echo "✅  5-copy book created  ID=$BOOK_ID"

# 1-copy book for out_of_stock test
ONECOPY_RESP=$(curl -s -X POST "$BASE/api/books" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"title\":\"Last Copy Book\",\"author\":\"Scarce Author\",\"isbn\":\"OC-$TS\",\"genre\":\"Science\",\"publishedYear\":2022,\"totalCopies\":1,\"description\":\"Only 1 copy for out_of_stock test\"}")
ONECOPY_ID=$(echo "$ONECOPY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['book']['_id'])" 2>/dev/null)
echo "✅  1-copy book created  ID=$ONECOPY_ID"

# Archived book — create then force status via mongosh
ARCHIVED_RESP=$(curl -s -X POST "$BASE/api/books" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"title\":\"Archived Book\",\"author\":\"Old Author\",\"isbn\":\"AR-$TS\",\"genre\":\"History\",\"publishedYear\":1990,\"totalCopies\":3,\"description\":\"Will be archived immediately\"}")
ARCHIVED_ID=$(echo "$ARCHIVED_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['book']['_id'])" 2>/dev/null)
mongosh mini-library --quiet --eval \
  "db.books.updateOne({ _id: ObjectId('$ARCHIVED_ID') }, { \$set: { status: 'archived' } })" 2>/dev/null
echo "✅  Archived book created  ID=$ARCHIVED_ID"

echo ""
echo "════════════════════════════════════════════════════"
echo "  BORROW / RETURN TEST SUITE"
echo "════════════════════════════════════════════════════"

# ── B01 — 401 No token ────────────────────────────────────────
echo ""
echo -e "${CYAN}════════ B01 — 401 No token ════════${RESET}"
run_test "POST /api/borrow/$BOOK_ID — no token" "401" \
  "POST" "/api/borrow/$BOOK_ID" "--" "none"

# ── B02 — 403 Admin tries to borrow ──────────────────────────
echo ""
echo -e "${CYAN}════════ B02 — 403 Wrong role (admin cannot borrow) ════════${RESET}"
run_test "POST /api/borrow/$BOOK_ID — admin token → 403" "403" \
  "POST" "/api/borrow/$BOOK_ID" "--" "ADMIN"

# ── B03 — 404 Book not found ──────────────────────────────────
echo ""
echo -e "${CYAN}════════ B03 — 404 Book not found ════════${RESET}"
run_test "POST /api/borrow/000000000000000000000000 — member → 404" "404" \
  "POST" "/api/borrow/000000000000000000000000" "--" "MEMBER"

# ── B04 — 400 Archived book ───────────────────────────────────
echo ""
echo -e "${CYAN}════════ B04 — 400 Archived book ════════${RESET}"
run_test "POST /api/borrow/$ARCHIVED_ID — archived → 400" "400" \
  "POST" "/api/borrow/$ARCHIVED_ID" "--" "MEMBER"

# ── B05 — 201 Successful borrow ───────────────────────────────
echo ""
echo -e "${CYAN}════════ B05 — 201 Successful borrow ════════${RESET}"
BORROW_RESP=$(curl -s -o /tmp/borrow_resp.json -w "%{http_code}" \
  -X POST "$BASE/api/borrow/$BOOK_ID" \
  -H "Authorization: Bearer $MEMBER_TOKEN")
echo "HTTP $BORROW_RESP"
BORROW_ID=$(python3 -c "import sys,json; print(json.load(open('/tmp/borrow_resp.json'))['data']['borrowId'])" 2>/dev/null)
DUE_DATE=$(python3 -c "import sys,json; print(json.load(open('/tmp/borrow_resp.json'))['data']['dueDate'])" 2>/dev/null)
python3 -m json.tool /tmp/borrow_resp.json 2>/dev/null || cat /tmp/borrow_resp.json
if [ "$BORROW_RESP" = "201" ]; then
  echo -e "${GREEN}✅  [201] Borrow created  ID=$BORROW_ID  dueDate=$DUE_DATE${RESET}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}❌  [$BORROW_RESP] Borrow failed (expected 201)${RESET}"
  FAIL=$((FAIL + 1))
fi
echo "---"

# ── B06 — 200 My history (1 active borrow) ────────────────────
echo ""
echo -e "${CYAN}════════ B06 — 200 Get member history ════════${RESET}"
run_test "GET /api/borrow/history — member → 200" "200" \
  "GET" "/api/borrow/history" "--" "MEMBER"

# ── B07 — 409 Duplicate active borrow ────────────────────────
echo ""
echo -e "${CYAN}════════ B07 — 409 Duplicate active borrow ════════${RESET}"
run_test "POST /api/borrow/$BOOK_ID — already borrowed → 409" "409" \
  "POST" "/api/borrow/$BOOK_ID" "--" "MEMBER"

# ── B08 — 200 Return book ─────────────────────────────────────
echo ""
echo -e "${CYAN}════════ B08 — 200 Return book ════════${RESET}"
run_test "POST /api/borrow/return/$BORROW_ID — member → 200" "200" \
  "POST" "/api/borrow/return/$BORROW_ID" "--" "MEMBER"

# ── B09 — 400 Return already-returned book ────────────────────
echo ""
echo -e "${CYAN}════════ B09 — 400 Return already-returned ════════${RESET}"
run_test "POST /api/borrow/return/$BORROW_ID — already returned → 400" "400" \
  "POST" "/api/borrow/return/$BORROW_ID" "--" "MEMBER"

# ── B10 — 200 History filtered by status=returned ─────────────
echo ""
echo -e "${CYAN}════════ B10 — 200 History filtered by status=returned ════════${RESET}"
run_test "GET /api/borrow/history?status=returned — member → 200" "200" \
  "GET" "/api/borrow/history?status=returned" "--" "MEMBER"

# ── B11 — 201 Member borrows the 1-copy book ──────────────────
echo ""
echo -e "${CYAN}════════ B11 — 201 Member borrows last copy ════════${RESET}"
run_test "POST /api/borrow/$ONECOPY_ID — member → 201 (last copy)" "201" \
  "POST" "/api/borrow/$ONECOPY_ID" "--" "MEMBER"

# Verify book is now out_of_stock
BOOK_STATUS=$(curl -s "$BASE/api/books/$ONECOPY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['book']['status'])" 2>/dev/null)
echo "📌 Book status after last copy borrowed: $BOOK_STATUS (expected: out_of_stock)"
echo "---"

# ── B12 — 400 Second user tries to borrow out_of_stock book ───
echo ""
echo -e "${CYAN}════════ B12 — 400 Out of stock (different user) ════════${RESET}"
run_test "POST /api/borrow/$ONECOPY_ID — member2, out_of_stock → 400" "400" \
  "POST" "/api/borrow/$ONECOPY_ID" "--" "MEMBER2"

# ── B13 — 403 Member on admin route ──────────────────────────
echo ""
echo -e "${CYAN}════════ B13 — 403 Member on admin route ════════${RESET}"
run_test "GET /api/admin/borrow — member token → 403" "403" \
  "GET" "/api/admin/borrow" "--" "MEMBER"

# ── B14 — 200 Admin list all borrows ─────────────────────────
echo ""
echo -e "${CYAN}════════ B14 — 200 Admin list all borrows ════════${RESET}"
run_test "GET /api/admin/borrow — admin → 200" "200" \
  "GET" "/api/admin/borrow" "--" "ADMIN"

# ── B15 — 200 Admin filter by status=returned ─────────────────
echo ""
echo -e "${CYAN}════════ B15 — 200 Admin filter status=returned ════════${RESET}"
run_test "GET /api/admin/borrow?status=returned — admin → 200" "200" \
  "GET" "/api/admin/borrow?status=returned" "--" "ADMIN"

# ── B16 — 200 Admin filter overdue=true ────────────────────────
echo ""
echo -e "${CYAN}════════ B16 — 200 Admin filter overdue=true ════════${RESET}"
run_test "GET /api/admin/borrow?overdue=true — admin → 200" "200" \
  "GET" "/api/admin/borrow?overdue=true" "--" "ADMIN"

# ── Cleanup — remove seeded books ────────────────────────────
echo ""
echo -e "${CYAN}🧹 Cleaning up seeded test books...${RESET}"
# Return the 1-copy book borrow so it doesn't block future test runs
ONECOPY_BORROW_ID=$(curl -s "$BASE/api/borrow/history" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
for b in d['data']['borrows']:
    if str(b.get('bookId', {}).get('_id', b.get('bookId',''))) == '$ONECOPY_ID' and b['status'] == 'borrowed':
        print(b['_id'])
        break
" 2>/dev/null || echo "")
if [ -n "$ONECOPY_BORROW_ID" ]; then
  curl -s -X POST "$BASE/api/borrow/return/$ONECOPY_BORROW_ID" \
    -H "Authorization: Bearer $MEMBER_TOKEN" > /dev/null
  echo "✅  Returned 1-copy book borrow ($ONECOPY_BORROW_ID)"
fi

# Soft-delete the seeded books
for BID in "$BOOK_ID" "$ONECOPY_ID" "$ARCHIVED_ID"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/books/$BID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  echo "✅  Deleted book $BID ($STATUS)"
done

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  ✅  ALL $TOTAL TESTS PASSED${RESET}"
else
  echo -e "${RED}  ❌  $FAIL/$TOTAL TESTS FAILED${RESET}"
fi
echo "════════════════════════════════════════════════════"
echo ""

exit $FAIL
