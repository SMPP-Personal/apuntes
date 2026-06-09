# renomear_ud3_html_sen_git_v2.ps1
# Renomea ficheiros HTML problemáticos de UD3 sen depender de git.
# Executar desde a raíz do repositorio:
#   C:\REPOSITORIOS\SMPP-PERSONAL\elsaucelloron
#
# Despois dos cambios podes facer commit desde GitHub Desktop, VS Code ou terminal.

$ErrorActionPreference = "Stop"

function Convert-ToKey {
    param([Parameter(Mandatory=$true)][string]$Text)

    # Quita extension .html
    $name = [System.IO.Path]::GetFileNameWithoutExtension($Text)

    # Normaliza acentos: á -> a, é -> e, ñ -> n, etc.
    $normalized = $name.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder

    foreach ($ch in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($ch)
        }
    }

    $plain = $sb.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()

    # Converte calquera separador raro nun guion bajo único
    $plain = $plain -replace '[^a-z0-9]+', '_'
    $plain = $plain -replace '_+', '_'
    $plain = $plain.Trim('_')

    return $plain
}

function Rename-ByKey {
    param(
        [Parameter(Mandatory=$true)][string]$Directory,
        [Parameter(Mandatory=$true)][string]$OldKey,
        [Parameter(Mandatory=$true)][string]$NewName
    )

    if (-not (Test-Path -LiteralPath $Directory)) {
        Write-Warning "Non existe o directorio: ${Directory}"
        return
    }

    $targetPath = Join-Path $Directory $NewName

    if (Test-Path -LiteralPath $targetPath) {
        Write-Host "Xa existe, non se toca: ${targetPath}" -ForegroundColor Yellow
        return
    }

    $matches = @(
        Get-ChildItem -LiteralPath $Directory -File -Filter "*.html" |
        Where-Object { (Convert-ToKey $_.Name) -eq $OldKey }
    )

    if ($matches.Count -eq 0) {
        Write-Warning "Non se atopou ficheiro para clave: ${OldKey}"
        Write-Host "Ficheiros existentes en ${Directory}:" -ForegroundColor DarkGray
        Get-ChildItem -LiteralPath $Directory -File -Filter "*.html" |
            ForEach-Object {
                $key = Convert-ToKey $_.Name
                Write-Host ("  - " + $_.Name + "  [key=" + $key + "]") -ForegroundColor DarkGray
            }
        return
    }

    if ($matches.Count -gt 1) {
        throw "Hai mais dun ficheiro que coincide coa clave ${OldKey} en ${Directory}"
    }

    $oldFile = $matches[0]
    Write-Host "Renomeando:" -ForegroundColor Cyan
    Write-Host ("  " + $oldFile.FullName)
    Write-Host ("  -> " + $NewName)

    Rename-Item -LiteralPath $oldFile.FullName -NewName $NewName
}

$B2 = "IMSO_26-27/portal_web/UD3_Monitorizacion_Rendemento/B2_Auditoria_uso_acceso"
$B3 = "IMSO_26-27/portal_web/UD3_Monitorizacion_Rendemento/B3_Mantemento_incidencias"

# B2 - Auditoria de uso e acceso
Rename-ByKey $B2 "ud3_b2_practica_guiada_auditoria_de_uso_e_acceso" "UD3_B2_practica_guiada_auditoria_uso_acceso.html"
Rename-ByKey $B2 "ud3_b2_exercicios_de_auditoria_de_uso_e_acceso" "UD3_B2_exercicios_auditoria_uso_acceso.html"
Rename-ByKey $B2 "ud3_b2_apuntes_auditoria_de_uso_e_acceso" "UD3_B2_apuntes_auditoria_uso_acceso.html"
Rename-ByKey $B2 "ud3_b2_practica_globalizadora_auditoria_de_uso_e_acceso" "UD3_B2_practica_globalizadora_auditoria_uso_acceso.html"

# B3 - Mantemento e incidencias
Rename-ByKey $B3 "ud3_b3_mantemento_incidencias_asistencia_tecnica" "UD3_B3_mantemento_incidencias_asistencia_tecnica.html"
Rename-ByKey $B3 "ud3_b3_exercicios_mantemento_incidencias_asistencia_tecnica" "UD3_B3_exercicios_mantemento_incidencias_asistencia_tecnica.html"
Rename-ByKey $B3 "ud3_b3_practica_guiada_mantemento_incidencias_asistencia_tecnica" "UD3_B3_practica_guiada_mantemento_incidencias_asistencia_tecnica.html"
Rename-ByKey $B3 "ud3_b3_practica_globalizadora_mantemento_incidencias_asistencia_tecnica" "UD3_B3_practica_globalizadora_mantemento_incidencias_asistencia_tecnica.html"

Write-Host ""
Write-Host "Proceso rematado. Revisa o estado desde VS Code, GitHub Desktop ou co comando git status se Git esta instalado." -ForegroundColor Green
