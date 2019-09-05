#!/bin/bash

# Kubernentes setup

export PROJECT_NAME=countly-playground
export CLUSTER_NAME=countly
export ZONE_NAME=europe-west3-b
export GCE_USER=YOUR@EMAIL.ADDRESS

gcloud config set project "${PROJECT_NAME}"
gcloud config set compute/zone "${ZONE_NAME}"
gcloud components update
gcloud container clusters get-credentials ${CLUSTER_NAME}
kubectl config set-cluster ${CLUSTER_NAME}

# Cluster setup
# give user rights to give helm rights
kubectl create clusterrolebinding user-cluster-admin-binding   --clusterrole=cluster-admin   --user=${GCE_USER}
kubectl create clusterrolebinding tiller-cluster-admin-binding --clusterrole=cluster-admin --serviceaccount=kube-system:tiller

# give helm the rights
kubectl create -f rbac-config.yaml
kubectl --namespace kube-system create serviceaccount tiller
helm init
kubectl --namespace kube-system patch deploy tiller-deploy -p '{"spec":{"template":{"spec":{"serviceAccount":"tiller"}}}}' 


# Install MongoDB

## Create static IP address
gcloud compute addresses create countly-static-ip --global

## Create a namespace
kubectl create ns countly
kubectl config set-context --current --namespace=countly

## MongoDB helm
kubectl apply -f mongo/storage-class.yaml
helm install --name db -f mongo/values.yaml stable/mongodb-replicaset

## Wait ~ 3 minutes until all 3 replica set containers spin up
kubectl get po


# Install Countly deployments & services
kubectl apply -f countly-frontend.yaml
kubectl apply -f countly-frontend-service.yaml
kubectl apply -f countly-api.yaml
kubectl apply -f countly-api-service.yaml

# Install Countly ingress
kubectl apply -f countly-ingress-gce.yaml
# Alternatively install ingress without static address created above
kubectl apply -f countly-ingress.yaml

## Wait ~ 3 minutes until all Countly nodes spin up
kubectl get po

## Wait ~ 5-10 minutes until Ingress sets up and open static Countly IP address:
# Check Ingress status at GCE console in the meantime, then wait 10 more minutes
kubectl get ing
