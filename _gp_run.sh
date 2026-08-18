#!/bin/bash
UD=$(mktemp -d)
OUT=/c/Users/sinan/Desktop/10\ Code/baqless-prototype/_gp_out.html
timeout 75 "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --user-data-dir="$UD" --window-size=1460,2600 --virtual-time-budget=8000 --autoplay-policy=no-user-gesture-required --dump-dom "$1" 2>/dev/null > "$OUT"
python -X utf8 -c "
import re,io,html
s=io.open('C:/Users/sinan/Desktop/10 Code/baqless-prototype/_gp_out.html',encoding='utf-8',errors='replace').read()
m=re.search(r'<pre id=\"out\">(.*?)</pre>',s,re.S)
print(html.unescape(m.group(1)) if m else 'NO OUTPUT len=%d'%len(s))
"
