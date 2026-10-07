@echo off
title threads-autopilot setup
echo Installing threads-autopilot. This window shows the progress; do not close it.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/mur4i/threads-autopilot/main/install.ps1 | iex"
echo.
pause
