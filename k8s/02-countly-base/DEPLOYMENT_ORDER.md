# Countly Base Deployment Order

The numbered folders indicate the required deployment sequence:

## 00-prerequisites/
**Must be deployed first**
- Creates the `countly` namespace
- Creates the service account with image pull secrets

```bash
kubectl apply -k 02-countly-base/00-prerequisites/
```

## 01-secrets/
**Deploy once, manually managed**
- Contains secret configurations for MongoDB, ClickHouse, and common settings
- Secrets have `disableNameSuffixHash: true` to prevent regeneration on each deployment

Before deploying:
1. Copy example files:
   ```bash
   cd 02-countly-base/secrets/
   cp common.env.example common.env
   cp mongodb.env.example mongodb.env
   cp clickhouse.env.example clickhouse.env
   ```
2. Edit each file with your actual values
3. Deploy:
   ```bash
   kubectl apply -k 02-countly-base/01-secrets/
   ```

## 02-core-services/
**Deploy after prerequisites and secrets**
- All Countly services (API, Frontend, Ingestor, etc.)
- ConfigMaps for service configuration
- HPA configurations

```bash
kubectl apply -k 02-countly-base/02-core-services/
```

## 03-ingress/
**Deploy after core services**
- Ingress rules for routing traffic to Countly services
- Requires NGINX Ingress Controller to be installed first

```bash
kubectl apply -k 02-countly-base/03-ingress/
```

## Full Deployment (excluding secrets)

To deploy everything except secrets in one command:
```bash
kubectl apply -k 02-countly-base/
```

Note: This will deploy 00-prerequisites, 02-core-services, and 03-ingress but NOT 01-secrets.