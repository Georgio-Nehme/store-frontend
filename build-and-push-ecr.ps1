param(
    [Parameter(Mandatory=$true)][string]$EcrUri,
    [Parameter(Mandatory=$true)][string]$ImageName,
    [string]$Tag = "latest",
    [string]$Dockerfile = "Dockerfile",
    [string]$Region = $env:AWS_REGION
)

if (-not $Region) { Write-Host "AWS_REGION not set; defaulting to eu-central-1"; $Region = 'eu-central-1' }

Write-Host "Installing dependencies and building frontend"
if (Test-Path package.json) {
    npm ci
    npm run build
}

Write-Host "Logging into ECR $EcrUri in $Region"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri

$fullTag = "$EcrUri/$ImageName:$Tag"
$latestTag = "$EcrUri/$ImageName:latest"
Write-Host "Building image $fullTag and $latestTag"
docker build -f $Dockerfile -t $fullTag -t $latestTag .

Write-Host "Pushing $fullTag"
docker push $fullTag
Write-Host "Pushing $latestTag"
docker push $latestTag

Write-Host "Done"