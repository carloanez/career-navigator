"""Prepare an explicit public runtime allowlist for the existing Academy WordPress host."""
from pathlib import Path
import base64, hashlib, json, re, sys, zipfile
source=Path(__file__).resolve().parents[1]
release=sys.argv[1];output=Path(sys.argv[2]);output.mkdir(parents=True,exist_ok=True)
assert re.fullmatch(r'v[0-9A-Za-z.\-]+',release)
prefix='/wp-content/career-navigator/releases/'+release+'/'
names=['index.html','styles.css','cause-finder-theme.css','guided-assessment.css','career-tools.css','account.css','catalog.js','career-tools-model.js','engine.js','guided-assessment.js','resume-files.js','career-tools-ui.js','account-client.js','military-journey-model.js','military-journey-ui.js','military-journey.css','nova-chat.css','nova-chat.js','app.js','assets/cause-finder-logo.png',
       'job-search/index.html','job-search/style.css','job-search/model.js','job-search/app.js',
       'job-search/the-90-day-job-search.docx']
files={}
for name in names:
 data=(source/name).read_bytes()
 if name=='index.html':
  s=data.decode();s=re.sub(r'(src|href)="([^"#][^"]*)"',lambda m:m[1]+'="'+prefix+m[2]+'"',s)
  s=s.replace('<meta name="theme-color"','<meta name="robots" content="noindex, nofollow">\n  <meta name="theme-color"')
  s=s.replace('<div class="workspace-label">','<a href="/" class="academy-back">← IgniteCyber Academy</a><div class="workspace-label">')
  data=s.encode()
 files[name]=data
with zipfile.ZipFile(output/'public-runtime.zip','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in files.items():z.writestr(n,v)
(output/'manifest.json').write_text(json.dumps({'release':release,'files':{n:hashlib.sha256(v).hexdigest()for n,v in files.items()}},indent=2))
payload={'release':release,'files':{n:base64.b64encode(v).decode()for n,v in files.items()},'plugins':{n:base64.b64encode((source/'server'/n).read_bytes()).decode()for n in ['ignite-career-navigator.php','ignite-career-accounts.php','ignite-career-nova.php','ignite-career-linkedin.php','ignite-career-csp.php']}}
(output/'deploy-payload.json').write_text(json.dumps(payload))
print('Prepared',len(files),'public runtime files and five server plugins.')
