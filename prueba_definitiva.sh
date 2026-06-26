#!/bin/bash

# ==========================================
# PRUEBA DEFINITIVA DE COMANDO (SIN PIPES)
# ==========================================
PROJECT_DIR="/home/angela_zhou_22-04/Simulator-SO"
AGENT_NAME="@agent-simulator-so"
CLAUDE_BIN="/home/angela_zhou_22-04/.nvm/versions/node/v22.22.1/bin/claude"
LOG_FILE="$PROJECT_DIR/log_prueba_definitiva.txt"

echo "🚀 Lanzando Claude con flags de automatización..."
echo "Comando: $CLAUDE_BIN -p --dangerously-skip-permissions --agent $AGENT_NAME 'PRUEBA_EXITOSA'"

# Ejecución limpia: sin tuberías (pipes) que generen error de stdin
"$CLAUDE_BIN" -p --dangerously-skip-permissions --agent "$AGENT_NAME" "Responde ÚNICAMENTE con el texto: PRUEBA_EXITOSA_CLAUDE_OK" > "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "------------------------------------------------------------"
echo "📄 RESULTADO DEL LOG (Primeras 10 líneas):"
head -n 10 "$LOG_FILE"
echo "------------------------------------------------------------"

if [ $EXIT_CODE -eq 0 ]; then
    if grep -q "PRUEBA_EXITOSA_CLAUDE_OK" "$LOG_FILE"; then
        echo "✅ ¡ÉXITO! El comando funciona y Claude ha respondido correctamente."
    else
        echo "⚠️ Claude ha respondido, pero no contiene el texto esperado. Revisa el log completo."
    fi
else
    echo "❌ Error en la ejecución (Código $EXIT_CODE)."
    if grep -iq "monthly spend limit" "$LOG_FILE"; then
        echo "🛑 ERROR DE SALDO: Has alcanzado tu límite mensual en la API."
    elif grep -iq "529" "$LOG_FILE"; then
        echo "🛑 ERROR DE SERVIDOR: Servidores saturados (529)."
    else
        echo "🛑 ERROR DESCONOCIDO: Revisa el log completo en $LOG_FILE"
    fi
fi