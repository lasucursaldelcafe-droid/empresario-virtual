@echo off
cd /d "%~dp0.."
py -3 launcher\main.py 2>nul || python launcher\main.py
