param(
  [string]$Profile = "default",
  [string]$SkillId = "",
  [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = "Stop"

function Resolve-SkillId {
  param([string]$GivenSkillId, [string]$ProjectRoot, [string]$ProfileName)
  if ($GivenSkillId) { return $GivenSkillId }
  $resourcesPath = Join-Path $ProjectRoot "ask-resources.json"
  if (-not (Test-Path $resourcesPath)) {
    throw "ask-resources.json nao encontrado. Copie ask-resources.example.json ou informe -SkillId."
  }
  $resources = Get-Content -Raw $resourcesPath | ConvertFrom-Json
  $id = $resources.profiles.$ProfileName.skillId
  if (-not $id) {
    throw "skillId nao encontrado no perfil '$ProfileName' em ask-resources.json"
  }
  return $id
}

function Wait-InteractionModelReady {
  param([string]$SkillIdValue, [string]$ProfileName, [int]$TimeoutSec)
  $start = Get-Date
  while ($true) {
    $json = ask.cmd smapi get-skill-status --skill-id $SkillIdValue --resource interactionModel --profile $ProfileName | ConvertFrom-Json
    $status = $json.interactionModel.'pt-BR'.lastUpdateRequest.status
    if ($status -eq "SUCCEEDED") { return }
    if ($status -eq "FAILED") { throw "Build do interaction model falhou." }
    if (((Get-Date) - $start).TotalSeconds -gt $TimeoutSec) {
      throw "Timeout esperando interaction model concluir."
    }
    Start-Sleep -Seconds 8
  }
}

function Wait-HostedDeployment {
  param([string]$SkillIdValue, [string]$ProfileName, [string]$CommitId, [int]$TimeoutSec)
  $start = Get-Date
  while ($true) {
    $json = ask.cmd smapi get-skill-status --skill-id $SkillIdValue --resource hostedSkillDeployment --profile $ProfileName | ConvertFrom-Json
    $request = $json.hostedSkillDeployment.lastUpdateRequest
    $status = $request.status
    $deployedCommit = $request.deploymentDetails.commitId
    if ($status -eq "SUCCEEDED" -and $deployedCommit -eq $CommitId) { return }
    if ($status -eq "FAILED") { throw "Deploy hosted falhou para commit $deployedCommit." }
    if (((Get-Date) - $start).TotalSeconds -gt $TimeoutSec) {
      throw "Timeout esperando hosted deployment concluir para commit $CommitId."
    }
    Start-Sleep -Seconds 10
  }
}

function New-AskPassFile {
  param([string]$Path)
  $bat = @'
@echo off
echo %~1 | findstr /I Username >nul
if %errorlevel%==0 (
  echo %GIT_USERNAME%
) else (
  echo %GIT_PASSWORD%
)
'@
  Set-Content -Path $Path -Value $bat -Encoding ASCII
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$skillIdValue = Resolve-SkillId -GivenSkillId $SkillId -ProjectRoot $projectRoot -ProfileName $Profile
$lambdaPackage = Get-Content -Raw (Join-Path $projectRoot "lambda\package.json") | ConvertFrom-Json
$requiredNodeMajor = [int]([regex]::Match($lambdaPackage.engines.node, "\d+").Value)
$hostedMeta = ask.cmd smapi get-alexa-hosted-skill-metadata --skill-id $skillIdValue --profile $Profile | ConvertFrom-Json
$hostedRuntime = $hostedMeta.alexaHosted.runtime
$hostedNodeMajor = [int]([regex]::Match($hostedRuntime, "\d+").Value)

if ($hostedNodeMajor -lt $requiredNodeMajor) {
  throw "Deploy cancelado: a skill Alexa-hosted usa $hostedRuntime, mas o projeto seguro exige Node.js $requiredNodeMajor ou superior. Use uma funcao AWS Lambda moderna e atualize o endpoint da skill."
}

Push-Location $projectRoot
Write-Host "0/5 Validando encoding e texto..."
node .\scripts\validate-text-encoding.js

Write-Host "1/5 Atualizando interaction model pt-BR..."
ask.cmd smapi set-interaction-model --skill-id $skillIdValue --stage development --locale pt-BR --interaction-model file:skill-package/interactionModels/custom/pt-BR.json --profile $Profile | Out-Null
Wait-InteractionModelReady -SkillIdValue $skillIdValue -ProfileName $Profile -TimeoutSec $TimeoutSeconds

Write-Host "2/5 Obtendo metadata hosted e credenciais temporarias..."
$repoUrl = $hostedMeta.alexaHosted.repository.url
$repoType = $hostedMeta.alexaHosted.repository.type
if (-not $repoUrl -or -not $repoType) {
  throw "Nao foi possivel obter URL/tipo do repositorio hosted."
}
$creds = ask.cmd smapi generate-credentials-for-alexa-hosted-skill --skill-id $skillIdValue --repository-url $repoUrl --repository-type $repoType --profile $Profile | ConvertFrom-Json
$username = $creds.repositoryCredentials.username
$password = $creds.repositoryCredentials.password
if (-not $username -or -not $password) {
  throw "Credenciais temporarias do repositorio hosted nao retornadas."
}

$tempRepo = Join-Path $env:TEMP ("alexa-hosted-sync-" + [Guid]::NewGuid().ToString("N"))
$askPass = Join-Path $env:TEMP ("askpass-" + [Guid]::NewGuid().ToString("N") + ".bat")
New-AskPassFile -Path $askPass

try {
  Write-Host "3/5 Sincronizando codigo + skill-package no repositorio hosted..."
  $env:GIT_USERNAME = $username
  $env:GIT_PASSWORD = $password
  $env:GIT_TERMINAL_PROMPT = "0"

  git -c credential.helper= -c core.askPass=$askPass clone $repoUrl $tempRepo | Out-Null

  Copy-Item -Path (Join-Path $projectRoot "lambda\\*") -Destination (Join-Path $tempRepo "lambda") -Recurse -Force
  Copy-Item -Path (Join-Path $projectRoot "skill-package\\*") -Destination (Join-Path $tempRepo "skill-package") -Recurse -Force

  Push-Location $tempRepo
  git config user.name "Lucas Skill Bot"
  git config user.email "lucas.skill.bot@example.com"
  git add lambda skill-package
  $changed = git diff --cached --name-only
  if (-not $changed) {
    Write-Host "Sem diferencas para publicar."
    $head = (git rev-parse HEAD).Trim()
    Pop-Location
    Write-Host "4/5 Verificando estado atual do hosted deployment..."
    Wait-HostedDeployment -SkillIdValue $skillIdValue -ProfileName $Profile -CommitId $head -TimeoutSec $TimeoutSeconds
    Write-Host "Deploy concluido. Commit ativo: $head"
    return
  }

  git commit -m "Deploy hosted: sync lambda + skill-package" | Out-Null
  $newCommit = (git rev-parse HEAD).Trim()
  git -c credential.helper= -c core.askPass=$askPass push origin HEAD:master | Out-Null
  Pop-Location

  Write-Host "4/5 Aguardando hosted deployment do commit $newCommit..."
  Wait-HostedDeployment -SkillIdValue $skillIdValue -ProfileName $Profile -CommitId $newCommit -TimeoutSec $TimeoutSeconds
  Write-Host "Deploy concluido. Commit ativo: $newCommit"
}
finally {
  Remove-Item Env:GIT_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
  if (Test-Path $askPass) { Remove-Item -Force $askPass }
  if (Test-Path $tempRepo) { Remove-Item -Recurse -Force $tempRepo }
  Pop-Location
}
