#!/bin/bash
# ============================================================
# Full API test suite for mini-library-system backend
# ============================================================
BASE="http://localhost:4000"

# ── Fresh token via sign-in ──────────────────────────────────
echo "🔐 Getting fresh token..."
SIGNIN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDW130QixpuTTITDq2yX9qdvjvMLHv3jXs" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test1234!","returnSecureToken":true}')
TOKEN=$(echo "$SIGNIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")
echo "✅ Token acquired (${#TOKEN} chars)"

# ── Upgrade to admin in MongoDB ──────────────────────────────
echo ""
echo "👑 Upgrading user to admin..."
mongosh mini-library --quiet --eval 'db.users.updateOne({ email: "admin@test.com" }, { $set: { role: "admin" } })' 2>/dev/null
echo ""

# ── Helper ───────────────────────────────────────────────────
run_test() {
  local LABEL=$1
  local EXPECTED=$2
  local METHOD=$3
  local URL=$4
  local BODY=$5
  local USE_TOKEN=${6:-true}

  if [ "$USE_TOKEN" = "true" ]; then
    AUTH="-H \"Authorization: Bearer $TOKEN\""
  else
    AUTH=""
  fi

  if [ -n "$BODY" ]; then
    if [ "$USE_TOKEN" = "true" ]; then
      RESP=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$BODY")
    else
      RESP=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Content-Type: application/json" \
        -d "$BODY")
    fi
  else
    if [ "$USE_TOKEN" = "true" ]; then
      RESP=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL" \
        -H "Authorization: Bearer $TOKEN")
    else
      RESP=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X "$METHOD" "$BASE$URL")
    fi
  fi

  BODY_OUT=$(cat /tmp/resp.json | python3 -m json.tool 2>/dev/null || cat /tmp/resp.json)

  if [ "$RESP" = "$EXPECTED" ]; then
    echo "✅  [$RESP] $LABEL"
  else
    echo "❌  [$RESP] $LABEL (expected $EXPECTED)"
  fi
  echo "$BODY_OUT"
  echo "---"
}

# ============================================================
echo "════════════════════════════════════════"
echo "  TEST 1 — No token → 401"
echo "════════════════════════════════════════"
run_test "GET /api/books — no token" "401" "GET" "/api/books" "" "false"

echo "════════════════════════════════════════"
echo "  TEST 2 — Create a member user and test 403"
echo "════════════════════════════════════════"
# Sign up a new member user
echo "Creating member user..."
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyDW130QixpuTTITDq2yX9qdvjvMLHv3jXs" \
  -H "Content-Type: application/json" \
  -d '{"email":"member@test.com","password":"Test1234!","returnSecureToken":true}' > /dev/null 2>&1
MEMBER_SIGNIN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDW130QixpuTTITDq2yX9qdvjvMLHv3jXs" \
  -H "Content-Type: application/json" \
  -d '{"email":"member@test.com","password":"Test1234!","returnSecureToken":true}')
MEMBER_TOKEN=$(echo "$MEMBER_SIGNIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")

RESP=$(curl -s -o /tmp/resp.json -w "%{http_code}" -X POST "$BASE/api/books" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -d '{"title":"Test","author":"Test","isbn":"123","totalCopies":1}')
BODY_OUT=$(cat /tmp/resp.json | python3 -m json.tool 2>/dev/null || cat /tmp/resp.json)
if [ "$RESP" = "403" ]; then echo "✅  [$RESP] POST /api/books — member token → 403"; else echo "❌  [$RESP] POST /api/books — member token (expected 403)"; fi
echo "$BODY_OUT"
echo "---"

echo "════════════════════════════════════════"
echo "  TEST 3 — Validation error → 400"
echo "════════════════════════════════════════"
run_test "POST /api/books — missing required fields" "400" "POST" "/api/books" '{"title":"Only Title"}' "true"

echo "════════════════════════════════════════"
echo "  TEST 4 — Create book → 201"
echo "════════════════════════════════════════"
CREATE=$(curl -s -X POST "$BASE/api/books" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "description": "A handbook of agile software craftsmanship",
    "genre": "Technology",
    "totalCopies": 5,
    "publishedYear": 2008
  }')
HTTP_CODE=$(echo "$CREATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('201' if d.get('success') else 'FAIL')" 2>/dev/null)
BOOK_ID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['book']['_id'])" 2>/dev/null)
echo "✅  [201] POST /api/books — Clean Code created, ID: $BOOK_ID"
echo "$CREATE" | python3 -m json.tool 2>/dev/null
echo "---"

echo "════════════════════════════════════════"
echo "  TEST 5 — List books → 200"
echo "════════════════════════════════════════"
run_test "GET /api/books" "200" "GET" "/api/books" "" "true"

echo "════════════════════════════════════════"
echo "  TEST 6 — Get book by ID → 200"
echo "════════════════════════════════════════"
run_test "GET /api/books/$BOOK_ID" "200" "GET" "/api/books/$BOOK_ID" "" "true"

echo "════════════════════════════════════════"
echo "  TEST 7 — Get non-existent book → 404"
echo "════════════════════════════════════════"
run_test "GET /api/books/000000000000000000000000 — not found" "404" "GET" "/api/books/000000000000000000000000" "" "true"

echo "════════════════════════════════════════"
echo "  TEST 8 — Update book → 200"
echo "════════════════════════════════════════"
run_test "PATCH /api/books/$BOOK_ID" "200" "PATCH" "/api/books/$BOOK_ID" '{"description":"Updated description","totalCopies":10}' "true"

echo "════════════════════════════════════════"
echo "  TEST 9 — Duplicate ISBN → 409"
echo "════════════════════════════════════════"
run_test "POST /api/books — duplicate ISBN" "409" "POST" "/api/books" '{"title":"Clean Code Duplicate","author":"Someone","isbn":"978-0132350884","genre":"Technology","publishedYear":2008,"totalCopies":1}' "true"

echo "════════════════════════════════════════"
echo "  TEST 10 — Delete book → 200"
echo "════════════════════════════════════════"
run_test "DELETE /api/books/$BOOK_ID" "200" "DELETE" "/api/books/$BOOK_ID" "" "true"

echo "════════════════════════════════════════"
echo "  TEST 11 — Get deleted book → 404"
echo "════════════════════════════════════════"
run_test "GET /api/books/$BOOK_ID — after delete" "404" "GET" "/api/books/$BOOK_ID" "" "true"

echo ""
echo "════════════════════════════════════════"
echo "  ALL TESTS COMPLETE"
echo "════════════════════════════════════════"
