@echo off
chcp 65001 >nul
title Rahgozar Automated Setup ^| نصب خودکار نرم‌افزار رهگذر

echo ========================================================
echo     نصب و راه‌اندازی خودکار نرم‌افزار رهگذر (Rahgozar)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطا] محیط Node.js روی سیستم شما یافت نشد!
    echo لطفاً Node.js نسخه 20 یا بالاتر را از https://nodejs.org نصب کنید.
    pause
    exit /b 1
)

echo [1/3] در حال نصب وابستگی‌های برنامه...
call npm install
if %errorlevel% neq 0 (
    echo [خطا] در فرآیند نصب وابستگی‌ها خطایی رخ داد.
    pause
    exit /b 1
)

echo.
echo [2/3] در حال دانلود و آماده‌سازی هسته رسمی sing-box...
node scripts/download-core.js

echo.
echo [3/3] در حال کامپایل و ساخت برنامه...
call npm run build
if %errorlevel% neq 0 (
    echo [خطا] خطا در کامپایل سورس کد.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   ✓ نصب با موفقیت انجام شد!
echo   برای اجرای زنده: npm run dev
echo   برای بسته‌بندی فایل اجرایی: npm run package
echo ========================================================
echo.
set /p runNow="آیا مایلید برنامه هم‌اکنون اجرا شود؟ (Y/N): "
if /i "%runNow%"=="Y" (
    call npm run dev
)
