@echo off
echo === QzonMe Project Storage Cleanup Script ===
echo Based on ChatGPT's suggestions, adapted for Windows

echo.
echo 1. Removing Node modules...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo ✅ node_modules removed
) else (
    echo ℹ️ node_modules already cleaned
)

echo.
echo 2. Removing build artifacts...
for %%d in (.next dist .cache .turbo .eslintcache coverage build) do (
    if exist "%%d" (
        rmdir /s /q "%%d"
        echo ✅ %%d removed
    )
)

echo.
echo 3. Removing test files...
del /q test-*.* 2>nul
echo ✅ Test files cleaned

echo.
echo 4. Removing temp files...
del /q *.tmp *.log 2>nul
echo ✅ Temporary files cleaned

echo.
echo 5. Removing large database files...
del /q *.sqlite *.db eng.traineddata 2>nul
echo ✅ Database files cleaned

echo.
echo 6. Git cleanup...
git gc --aggressive --prune=now
echo ✅ Git repository optimized

echo.
echo === Cleanup Complete! ===
echo Run 'npm install' when you need to work on the project again.
pause
