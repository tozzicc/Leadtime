@echo off
echo Iniciando serviços em segundo plano...
powershell -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run dev' -WindowStyle Hidden"
echo Concluído! O terminal fechará em breve.
ping -n 4 127.0.0.1 > nul
exit
