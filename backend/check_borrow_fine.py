#!/usr/bin/env python3
"""
check_borrow_fine.py — assertion helper for test-fine.sh

Usage:
  python3 check_borrow_fine.py <resp_file> <borrow_id> <expected_days> <expected_fine>

Reads a JSON response file (array of borrows at data.borrows or a single
borrowRecord at data.borrowRecord) and checks that the borrow with the given
ID has the expected daysOverdue and fine values.

Exits 0 on success, 1 on failure.
Prints coloured PASS/FAIL lines to stdout.
"""
import json
import sys

GREEN = "\033[32m"
RED   = "\033[31m"
RESET = "\033[0m"

def check(label: str, actual, expected):
    ok = str(actual) == str(expected)
    colour = GREEN if ok else RED
    tick   = "✅" if ok else "❌"
    print(f"{colour}    {tick}  {label} = {actual} (expected {expected}){RESET}")
    return ok

def main():
    resp_file = sys.argv[1]
    borrow_id = sys.argv[2]
    expected_days = sys.argv[3]
    expected_fine = sys.argv[4]

    with open(resp_file) as f:
        d = json.load(f)

    # Support both "single record" (return endpoint) and "list" (history endpoint)
    data = d.get("data", {})

    # Single return record
    if "borrowRecord" in data:
        record = data["borrowRecord"]
        if record.get("_id") != borrow_id:
            print(f"{RED}    ❌  Borrow ID mismatch: got {record.get('_id')}, want {borrow_id}{RESET}")
            sys.exit(1)
        ok1 = check("daysOverdue", record.get("daysOverdue", "MISSING"), expected_days)
        ok2 = check("fine",        record.get("fine",        "MISSING"), expected_fine)
        sys.exit(0 if ok1 and ok2 else 1)

    # List endpoint — find by ID
    borrows = data.get("borrows", [])
    record = next((b for b in borrows if b.get("_id") == borrow_id), None)
    if record is None:
        print(f"{RED}    ❌  Borrow {borrow_id} not found in response list{RESET}")
        sys.exit(1)

    ok1 = check("daysOverdue", record.get("daysOverdue", "MISSING"), expected_days)
    ok2 = check("fine",        record.get("fine",        "MISSING"), expected_fine)
    sys.exit(0 if ok1 and ok2 else 1)

if __name__ == "__main__":
    main()
