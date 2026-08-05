#!/bin/bash
set +e
BASE="https://ur-setup-os-next.preview.emergentagent.com/api"
PASS=0; FAIL=0
declare -a FAILED
run() {
  name="$1"; expected="$2"; actual="$3"; extra="$4"
  if [ "$actual" = "$expected" ]; then
    echo "PASS: $name ($actual)"
    PASS=$((PASS+1))
  else
    echo "FAIL: $name expected=$expected got=$actual $extra"
    FAILED+=("$name expected=$expected got=$actual")
    FAIL=$((FAIL+1))
  fi
}

echo "== Admin login =="
LOGIN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"teameagls0@gmail.com","password":"Admin@12345"}')
echo "$LOGIN" | head -c 400; echo
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))")
if [ -z "$TOKEN" ]; then echo "FATAL: no token"; exit 1; fi
AUTH="Authorization: Bearer $TOKEN"

# /auth/me
code=$(curl -s -o /tmp/me.json -w "%{http_code}" $BASE/auth/me -H "$AUTH")
run "auth/me" 200 $code

# heartbeat
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/heartbeat -H "$AUTH")
run "auth/heartbeat" 200 $code

# Register a new user (for role tests) - unique email
EMAIL="test_$(date +%s)@example.com"
REG=$(curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Pass@1234\",\"name\":\"Test User\"}")
code=$(echo "$REG" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d.get('user',{}).get('roles',['x'])[0]=='Pending' else 'no')" 2>/dev/null)
run "register-Pending-role" ok "$code" "$REG"

# Users list
USERS=$(curl -s $BASE/users -H "$AUTH")
code=$(echo "$USERS" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if isinstance(d,list) and len(d)>=1 else 'no')")
run "GET /users" ok "$code"

# Roles list (should auto-seed 19)
ROLES=$(curl -s $BASE/roles -H "$AUTH")
rcount=$(echo "$ROLES" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d) if isinstance(d,list) else 0)")
echo "Roles count: $rcount"
run "GET /roles has >=19" ok "$( [ "$rcount" -ge 19 ] && echo ok || echo no )"

# Create role
NR=$(curl -s -X POST $BASE/roles -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"TestRole_'$(date +%s)'","permissions":["read"]}')
code=$(echo "$NR" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d.get('id') else 'no')")
run "POST /roles" ok "$code"

# Task create + comment
TASK=$(curl -s -X POST $BASE/tasks -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"Test Task","assignee":"someone","priority":"high","status":"todo"}')
TID=$(echo "$TASK" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
run "POST /tasks" ok "$( [ -n "$TID" ] && echo ok || echo no )" "$TASK"

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/tasks -H "$AUTH")
run "GET /tasks" 200 $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/tasks/$TID" -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"done"}')
run "PATCH /tasks" 200 $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/tasks/$TID/comments" -H "$AUTH" -H 'Content-Type: application/json' -d '{"text":"hello"}')
run "POST task comment" 200 $code

# Events
EV=$(curl -s -X POST $BASE/events -H "$AUTH" -H 'Content-Type: application/json' -d '{"title":"Meet","type":"meeting","date":"2026-01-01T10:00:00Z"}')
EID=$(echo "$EV" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
run "POST /events" ok "$( [ -n "$EID" ] && echo ok || echo no )" "$EV"

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/events -H "$AUTH")
run "GET /events" 200 $code

# Channels
CH=$(curl -s $BASE/channels -H "$AUTH")
gen=$(echo "$CH" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if any(c.get('name')=='general' for c in d) else 'no')")
run "GET /channels auto-general" ok "$gen"

GCH=$(curl -s -X POST $BASE/channels -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"testchan","type":"group","members":[]}')
CID=$(echo "$GCH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
run "POST /channels group" ok "$( [ -n "$CID" ] && echo ok || echo no )" "$GCH"

MSG=$(curl -s -X POST $BASE/messages -H "$AUTH" -H 'Content-Type: application/json' -d "{\"channel_id\":\"$CID\",\"text\":\"hi\"}")
code=$(echo "$MSG" | python3 -c "import sys,json;print('ok' if json.load(sys.stdin).get('id') else 'no')")
run "POST /messages" ok "$code" "$MSG"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/channels/$CID/messages" -H "$AUTH")
run "GET channel messages" 200 $code

# Applications public - no auth, multipart
APP=$(curl -s -X POST $BASE/applications -F 'name=John' -F 'email=john@ex.com' -F 'phone=123' -F 'position=Engineer' -F 'message=hi')
AID=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
run "POST /applications public" ok "$( [ -n "$AID" ] && echo ok || echo no )" "$APP"

code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/applications -H "$AUTH")
run "GET /applications as CEO" 200 $code

code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/applications/$AID?status=Approve" -H "$AUTH")
run "PATCH app status" 200 $code

# HR attendance
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/hr/attendance -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"check_in"}')
run "POST hr/attendance" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/hr/attendance -H "$AUTH")
run "GET hr/attendance" 200 $code

# HR leaves
LV=$(curl -s -X POST $BASE/hr/leaves -H "$AUTH" -H 'Content-Type: application/json' -d '{"from_date":"2026-01-01","to_date":"2026-01-03","reason":"vacay"}')
LID=$(echo "$LV" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
run "POST hr/leaves" ok "$( [ -n "$LID" ] && echo ok || echo no )" "$LV"

code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE/hr/leaves/$LID?status=approved" -H "$AUTH")
run "PATCH leaves status" 200 $code

# Social post
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/social/posts -H "$AUTH" -H 'Content-Type: application/json' -d '{"platform":"tiktok","caption":"hello","schedule":"2026-02-01T10:00:00Z"}')
run "POST social/posts" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/social/posts -H "$AUTH")
run "GET social/posts" 200 $code

# AI
AI=$(curl -s -X POST $BASE/ai/generate -H "$AUTH" -H 'Content-Type: application/json' -d '{"prompt":"Write a short tiktok caption for coffee"}')
echo "AI resp: $(echo "$AI" | head -c 200)"
code=$(echo "$AI" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d.get('text') and len(d['text'])>3 else 'no')" 2>/dev/null)
run "POST ai/generate" ok "$code"

# Files upload
echo "hello" > /tmp/testfile.txt
UP=$(curl -s -X POST $BASE/files/upload -H "$AUTH" -F 'file=@/tmp/testfile.txt' -F 'category=general')
FNAME=$(echo "$UP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('filename',''))" 2>/dev/null)
run "POST files/upload" ok "$( [ -n "$FNAME" ] && echo ok || echo no )" "$UP"
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/files -H "$AUTH")
run "GET files" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/files/download/$FNAME" -H "$AUTH")
run "GET files/download" 200 $code

# Notifications
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/notifications -H "$AUTH")
run "GET notifications" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/notifications/read_all -H "$AUTH")
run "POST notifications/read_all" 200 $code

# Activity
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/activity -H "$AUTH")
run "GET activity" 200 $code

# Analytics summary
AN=$(curl -s $BASE/analytics/summary -H "$AUTH")
code=$(echo "$AN" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if 'tasks' in d and 'trend' in d else 'no')" 2>/dev/null)
run "GET analytics/summary" ok "$code" "$AN"

# Reports
for r in employees tasks applications social; do
  code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/reports/$r -H "$AUTH")
  run "GET reports/$r" 200 $code
done

# Generic collections
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/collection/orders -H "$AUTH" -H 'Content-Type: application/json' -d '{"item":"widget","qty":2}')
run "POST collection/orders" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/collection/orders -H "$AUTH")
run "GET collection/orders" 200 $code
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/collection/products -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"p1"}')
run "POST collection/products" 200 $code

# Search
SR=$(curl -s "$BASE/search?q=test" -H "$AUTH")
code=$(echo "$SR" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if any(k in d for k in ['users','tasks','applications','events','files']) else 'no')" 2>/dev/null)
run "GET search" ok "$code" "$SR"

# Role-based auth: create another non-CEO user and try /applications
E2="lowuser_$(date +%s)@example.com"
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"$E2\",\"password\":\"Pass@1234\",\"name\":\"Low\"}" > /dev/null
LR=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$E2\",\"password\":\"Pass@1234\"}")
LTOKEN=$(echo "$LR" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))")
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/applications -H "Authorization: Bearer $LTOKEN")
run "non-CEO GET /applications 403" 403 $code

# Logout & online status
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/logout -H "$AUTH")
run "POST auth/logout" 200 $code

echo
echo "======================"
echo "PASSED: $PASS"
echo "FAILED: $FAIL"
for f in "${FAILED[@]}"; do echo " - $f"; done
