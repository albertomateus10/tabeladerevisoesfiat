@echo off
chcp 65001 > nul
echo ==============================================================
echo       ATUALIZADOR DE DADOS - REVISÕES FIAT
echo ==============================================================
echo.
echo Executando script de extração de dados do Excel...
echo.

python "%~dp0atualizar_dados.py"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao atualizar os dados. 
    echo Verifique se o Python está instalado e se o arquivo Excel está na pasta.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================================
echo   Dados atualizados com sucesso! Abra o index.html no navegador.
echo ==============================================================
echo.
pause
