#!/bin/bash

helm template countly --output-dir output

oc apply -f output/countly/templates
