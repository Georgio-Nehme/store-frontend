param(
    [Parameter(Mandatory=$true)][string]$EcrUri,
    [Parameter(Mandatory=$true)][string]$ImageName,
    [string]$Tag = "latest",
    [string]$Dockerfile = "Dockerfile",
    [string]$Region = $env:AWS_REGION
)

if (-not $Region) { Write-Error "AWS_REGION not set. Provide -Region or set AWS_REGION environment variable."; exit 1 }

Write-Host "Installing dependencies and building frontend"
if (Test-Path package.json) {
    npm ci
    npm run build
}

Write-Host "Logging into ECR $EcrUri in $Region"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri

$fullTag = "$EcrUri/$ImageName:$Tag"
Write-Host "Building image $fullTag"
docker build -f $Dockerfile -t $fullTag .

Write-Host "Pushing $fullTag"
docker push $fullTag

Write-Host "Done"