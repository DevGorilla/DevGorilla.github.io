#!/usr/bin/env bash
BUCKET=dwesleybrown.com
DIR=$(dirname "$0")
aws  s3  sync $DIR s3://$BUCKET/ --profile personal
