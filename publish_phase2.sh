#!/usr/bin/env bash
cd /home/team/shared/site
bash ./publish.sh > /tmp/questionnaire_publish.txt 2>&1
echo "EXIT: $?" >> /tmp/questionnaire_publish.txt