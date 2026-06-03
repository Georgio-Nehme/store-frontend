Deployment notes

- Actions/workflows are locked to region: eu-central-1.
- Frontend public build-time vars (may be embedded in bundle):
  - NEXT_PUBLIC_API_URL
  - NEXT_PUBLIC_COGNITO_CLIENT_ID
- Do NOT embed secrets (client secret, DB credentials) into builds. Keep secrets in runtime environment or secret manager.

CI/ECR (GitHub secrets used by workflows):
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- ECR_REGISTRY
- ECR_REPOSITORY
