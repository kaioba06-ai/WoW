@echo off
cd /d "%~dp0"
echo ===== Kion Dev Server =====
echo.

:: Try node first
where node >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [node] Starting server on http://localhost:3000 ...
    node -e "const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');const ROOT=__dirname,PORT=3000;const MIME={'html':'text/html','js':'application/javascript','css':'text/css','png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','gif':'image/gif','svg':'image/svg+xml','ico':'image/x-icon','woff2':'font/woff2'};http.createServer((req,res)=>{let p=url.parse(req.url).pathname;if(p==='/')p='/index.html';const fp=path.join(ROOT,decodeURIComponent(p));fs.readFile(fp,(err,data)=>{if(err){res.writeHead(404);res.end('Not found: '+p);return;}const ext=path.extname(fp).slice(1).toLowerCase();res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});res.end(data);});}).listen(PORT,()=>{console.log('');console.log('  >> Open in browser: http://localhost:'+PORT);console.log('  >> Press Ctrl+C to stop');});"
    goto :end
)

:: Try python3
where python3 >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [python3] Starting server on http://localhost:3000 ...
    python3 -m http.server 3000
    goto :end
)

:: Try python
where python >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [python] Starting server on http://localhost:3000 ...
    python -m http.server 3000
    goto :end
)

:: Try npx
where npx >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [npx] Starting server on http://localhost:3000 ...
    npx serve . -p 3000
    goto :end
)

echo.
echo ERROR: node / python / npx が見つかりません。
echo 以下のいずれかをインストールしてください:
echo   - Node.js  : https://nodejs.org/
echo   - Python   : https://www.python.org/
echo.
pause

:end
