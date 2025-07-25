@echo off
REM Figma MCP Client Launcher Script for Windows
REM Runs the Python client for the Figma MCP Write Server

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Check if Python 3 is available
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python -c "import sys; exit(0 if sys.version_info >= (3, 7) else 1)" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python"
        goto :python_found
    )
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    python3 -c "import sys; exit(0 if sys.version_info >= (3, 7) else 1)" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python3"
        goto :python_found
    )
)

echo Error: Python 3.7+ is required but not found.
echo Please install Python 3.7 or later and ensure it's in your PATH.
pause
exit /b 1

:python_found
REM Check if required Python packages are installed
%PYTHON_CMD% -c "import fastmcp, prompt_toolkit, psutil, yaml" >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Required Python packages are missing.
    echo Please install the required packages:
    echo   pip install fastmcp prompt-toolkit psutil pyyaml
    pause
    exit /b 1
)

REM Change to script directory and run the Figma client
cd /d "%SCRIPT_DIR%"
echo Starting Figma MCP Client...
%PYTHON_CMD% src\figma_client.py

pause