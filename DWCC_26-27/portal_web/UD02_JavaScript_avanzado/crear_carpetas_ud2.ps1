# dir
# Crea las carpetas UD2 en el directorio actual

$carpetas = @(
    'UD2_B1-Obxectos_estruturas_de_datos_e_JavaScript_avanzado_sen_DOM',
    'UD2_B2-DOM_estrutura_acceso_e_manipulacion',
    'UD2_B3-Eventos_interaccion_co_usuario_e_formularios',
    'UD2_B4-Aplicacions_dinamicas_e_comunicacion_asincrona',
    'UD2_B5-Practica_global_final_da_UD2'
)

foreach ($carpeta in $carpetas) {
    if (-not (Test-Path -LiteralPath $carpeta)) {
        New-Item -ItemType Directory -Path $carpeta | Out-Null
        Write-Host "Creada: $carpeta"
    }
    else {
        Write-Host "Ya existe: $carpeta"
    }
}
